# Step 10: Scaling Up — Kubernetes, AWS, and the Self-Hosted Node

**Goal by the end of this step:** A clear, low-risk migration path from "free-tier Docker Compose" to "Kubernetes on AWS (or elsewhere), with an optional self-hosted worker node" — without rewriting your gateway or agent code.

This step is meant to be revisited **later**, once you have real usage/revenue justifying the added complexity. Nothing here needs to happen on day one.

---

## 10.1 Why move at all?

Docker Compose on a single Render/Railway free instance works fine for low traffic, but breaks down when:
- One popular agent needs to scale independently of others.
- A container crash should self-heal without manual intervention.
- You want zero-downtime deploys.
- Free-tier cold starts become unacceptable for paying users.

Kubernetes solves all of these — at the cost of more operational complexity, which is why it's a later step, not a day-one requirement.

---

## 10.2 Recommended: start with k3s, not full Kubernetes

**k3s** is a lightweight, certified Kubernetes distribution designed for smaller footprints — easier to run on a single AWS EC2 instance (or even your gaming laptop) than full-blown EKS, while using the same `kubectl`/manifest interface you'd use anywhere else.

```bash
curl -sfL https://get.k3s.io | sh -
```

This gives you a working single-node cluster in minutes.

---

## 10.3 Convert each agent into a Deployment + Service

Example for the Text Summarizer agent — `k8s/text-summarizer-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-text-summarizer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: agent-text-summarizer
  template:
    metadata:
      labels:
        app: agent-text-summarizer
    spec:
      containers:
        - name: agent-text-summarizer
          image: yourdockerhubusername/agent-text-summarizer:latest
          ports:
            - containerPort: 8080
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: agent-secrets
                  key: anthropic-api-key
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: agent-text-summarizer
spec:
  selector:
    app: agent-text-summarizer
  ports:
    - port: 8080
      targetPort: 8080
```

Apply it:

```bash
kubectl apply -f k8s/text-summarizer-deployment.yaml
```

Repeat this pattern for every agent — one Deployment + Service pair each.

---

## 10.4 Secrets management

```bash
kubectl create secret generic agent-secrets \
  --from-literal=anthropic-api-key=your_key_here \
  --from-literal=sms-api-key=your_key_here
```

Never commit real secrets into `k8s/*.yaml` files — reference them via `secretKeyRef` as shown above.

---

## 10.5 Ingress — one entry point for all agents

Instead of your Next.js gateway calling many different hostnames, use an Ingress so all agents are reachable under one domain with path-based routing:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agents-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /run
spec:
  rules:
    - host: agents.yourdomain.com
      http:
        paths:
          - path: /text-summarizer
            pathType: Prefix
            backend:
              service:
                name: agent-text-summarizer
                port:
                  number: 8080
          - path: /sms-sender
            pathType: Prefix
            backend:
              service:
                name: agent-sms-sender
                port:
                  number: 8080
```

Update `agents.runtime_url` in Supabase to:
```
https://agents.yourdomain.com/text-summarizer
https://agents.yourdomain.com/sms-sender
```
No gateway code changes needed — same pattern as the free-tier migration in Step 8.

---

## 10.6 Autoscaling popular agents independently

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agent-text-summarizer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agent-text-summarizer
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

This means a heavily-used agent scales up automatically while a rarely-used one stays at minimal replicas — real cost efficiency at scale.

---

## 10.7 Moving to AWS specifically (when ready)

Options, roughly in order of complexity:
1. **Single EC2 instance running k3s** — cheapest, simplest; good stepping stone before managed Kubernetes.
2. **Amazon EKS** — fully managed control plane, more expensive but production-grade, integrates with AWS IAM/VPC/ALB.
3. Use **ECS with Fargate** instead of Kubernetes entirely, if you decide full k8s is more complexity than you want — simpler container orchestration, still AWS-native, still scriptable via CI/CD.

Update your CI/CD pipeline (Step 9) to `kubectl apply` or push to ECS instead of hitting Render's deploy hook, once you migrate.

---

## 10.8 The "admin switch" in practice

Recall the `deployment_env` column added in Step 8. As you migrate agents one at a time:

```sql
update agents
set runtime_url = 'https://agents.yourdomain.com/text-summarizer',
    deployment_env = 'aws'
where slug = 'text-summarizer';
```

Agents not yet migrated simply keep pointing at their free-tier `runtime_url` — the gateway route doesn't care, since it always just reads `runtime_url` from the database and forwards the request there. This lets you migrate gradually, agent by agent, with zero downtime and zero code changes in the gateway.

---

## 10.9 Optional: self-hosted node (your gaming laptop)

For **non-critical or background agents** where occasional downtime is acceptable, you can add your gaming laptop as an extra worker:

1. Install k3s in **agent** mode, joining your main cluster:
   ```bash
   curl -sfL https://get.k3s.io | K3S_URL=https://your-main-node:6443 K3S_TOKEN=your_node_token sh -
   ```
2. Use `nodeSelector` in a Deployment to pin specific agents to this node:
   ```yaml
   spec:
     template:
       spec:
         nodeSelector:
           kubernetes.io/hostname: your-laptop-node-name
   ```
3. Expose it to the internet safely via **Cloudflare Tunnel** (`cloudflared`) instead of opening router ports directly — this avoids exposing your home IP and handles TLS for you.

This is genuinely optional and only worth doing once you're comfortable with the rest of the stack — treat it as a "nice to have later," not a blocker.

---

## Checklist (long-term, not immediate)
- [ ] k3s cluster running (locally or on a cheap EC2 instance) as a learning/staging environment
- [ ] At least one agent successfully converted to a Deployment + Service and reachable via `kubectl port-forward` or Ingress
- [ ] Secrets managed via Kubernetes Secrets, not hardcoded
- [ ] HPA configured for at least one agent to demonstrate autoscaling
- [ ] `deployment_env` column used to track which agents have migrated
- [ ] (Optional) Gaming laptop joined as a worker node via Cloudflare Tunnel
