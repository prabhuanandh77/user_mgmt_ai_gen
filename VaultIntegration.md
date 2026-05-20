# Integration Walkthrough: Retrieving PostgreSQL Password from Vault

We have successfully integrated **HashiCorp Vault** with the Spring Boot backend deployed in Minikube. Database credentials are no longer statically declared in K8s secrets; instead, they are dynamically retrieved from Vault using the **Vault Agent Injector** sidecar/init-container pattern.

---

## Changes Implemented

### 1. Spring Boot Properties Import
In [application.properties](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/backend/src/main/resources/application.properties), we added a configuration line to dynamically load the properties injected by the Vault Agent sidecar when running inside Kubernetes, while gracefully falling back to environment variables when running locally:
```properties
spring.config.import=optional:file:/vault/secrets/db-creds.properties
```

### 2. Vault Agent Injector Annotations
In [backend-deployment.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/backend/backend-deployment.yaml), we added annotations to trigger the injection of `vault-agent` containers:
```yaml
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "backend-role"
        vault.hashicorp.com/agent-inject-secret-db-creds.properties: "secret/data/database/config"
        vault.hashicorp.com/agent-inject-template-db-creds.properties: |
          {{- with secret "secret/data/database/config" -}}
          spring.datasource.username={{ .Data.data.username }}
          spring.datasource.password={{ .Data.data.password }}
          {{- end -}}
```

---

## Verification and Output

We verified the end-to-end integration successfully in the Minikube environment:

### Step 1: Rebuilt Backend Container
```powershell
minikube image build -t application-backend:latest ./backend
```
*Result: Image successfully built inside the Minikube registry.*

### Step 2: Applied Manifests and Redeployed Backend
```powershell
kubectl apply -f k8s/backend/backend-deployment.yaml
kubectl rollout restart deployment backend-deployment
```
*Result: The deployment was configured and the pods restarted cleanly.*

### Step 3: Verified Vault Agent Sidecar Injector
We inspected the pods to ensure the sidecar was successfully injected (showing `2/2` containers ready):
```powershell
kubectl get pods -l app=backend
```
**Output:**
```text
NAME                                  READY   STATUS    RESTARTS   AGE
backend-deployment-7f6b8d67d9-48jp7   2/2     Running   0          48s
```

### Step 4: Checked Injected Secrets
We verified that Vault successfully wrote the credentials from Vault (`secret/data/database/config`) into `/vault/secrets/db-creds.properties` in the container:
```powershell
kubectl exec backend-deployment-7f6b8d67d9-48jp7 -c backend -- cat /vault/secrets/db-creds.properties
```
**Output:**
```properties
spring.datasource.username=myuser
spring.datasource.password=mysecretpassword
```

### Step 5: Verified Database Connectivity in Application Logs
We checked the backend container logs to verify that Spring Boot successfully loaded the properties from `/vault/secrets/db-creds.properties` and established a database connection:
```powershell
kubectl logs backend-deployment-7f6b8d67d9-48jp7 -c backend
```
**Output Logs:**
```text
2026-05-20T06:27:45.745Z  INFO 1 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
2026-05-20T06:27:48.254Z  INFO 1 --- [           main] com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@28c88600
2026-05-20T06:27:48.257Z  INFO 1 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
```

The database connection has been established securely using dynamic secrets managed by Vault!
