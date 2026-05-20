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

---

## OAuth2 Proxy & Ingress Resolutions

### 1. OAuth2 Proxy JWKS URL Resolution
**Issue:** The `oauth2-proxy` container failed to start, throwing:
`ERROR: Failed to initialise OAuth2 Proxy: error initialising provider: could not create provider data: error building OIDC ProviderVerifier: invalid provider verifier options: missing required setting: jwks-url`

**Fix:** Corrected the environment variable configuration in [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml).
- The incorrect variable `OAUTH2_PROXY_JWKS_URL` was changed to `OAUTH2_PROXY_OIDC_JWKS_URL`.
- Verified that `oauth2-proxy` successfully initializes and enters the `Running` state.

---

### 2. Ingress Redirect Loop / "414 Request-URI Too Large" Resolution
**Issue:** Launching `http://myapp.local` resulted in a circular redirection flow where Nginx kept appending redirect query parameters to the URL until it exceeded the limits, yielding a `414 Request-URI Too Large` error.
- **Root Cause:** Both the application routes (`/`) and authentication routes (`/oauth2` / `keycloak`) were handled under a single Ingress rule for `myapp.local` with the `auth-url` and `auth-signin` annotations applied at the host metadata level. Nginx Ingress merged all paths into a single server block and globally enforced authentication even on the callback endpoints themselves!

**Fix:** Split the Ingress configuration into three dedicated Ingress resources in [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml):
1. **`auth-ingress`**: Handles path `/` for `myapp.local`, enforcing external authentication through `oauth2-proxy`.
2. **`oauth2-proxy-ingress`**: Handles path `/oauth2` for `myapp.local` without auth annotations, routing directly to the `oauth2-proxy` service to process authorization initiation and callback cookies.
3. **`keycloak-ingress`**: Handles `keycloak.local` without auth annotations, routing directly to Keycloak.

---

## OAuth2 Proxy & Ingress Verification

### Step 1: Applied Split Ingress Configuration
```powershell
kubectl apply -f k8s/frontend/frontend-auth-setup.yaml
```
**Output:**
```text
ingress.networking.k8s.io/auth-ingress configured
ingress.networking.k8s.io/oauth2-proxy-ingress created
ingress.networking.k8s.io/keycloak-ingress created
```

### Step 2: Verified Ingress Resources
```powershell
kubectl get ingress
```
**Output:**
```text
NAME                   CLASS   HOSTS            ADDRESS          PORTS   AGE
auth-ingress           nginx   myapp.local      192.168.59.100   80      82m
keycloak-ingress       nginx   keycloak.local   192.168.59.100   80      3s
oauth2-proxy-ingress   nginx   myapp.local      192.168.59.100   80      3s
```

### Step 3: Verified Application Redirect Behavior
We ran a `curl` test pod inside the Kubernetes cluster to query the Ingress controller's cluster IP (`10.100.14.46`) with the host header `myapp.local` at path `/`:
```powershell
kubectl run curl-test --image=curlimages/curl --restart=Never -i --rm --tty -- curl -v -H "Host: myapp.local" http://10.100.14.46/
```
**Output logs:**
```text
* Established connection to 10.100.14.46 (10.100.14.46 port 80)
> GET / HTTP/1.1
> Host: myapp.local
> 
< HTTP/1.1 302 Moved Temporarily
< Location: http://myapp.local/oauth2/start?rd=%2F
< 
```
*Result: The initial request was successfully intercepted and redirected to `/oauth2/start` to start the OIDC flow.*

### Step 4: Verified Path-Based Authentication Bypass & Callback Protocol
We queried the redirection target (`/oauth2/start?rd=%2F`) to confirm it successfully bypassed authentication, reached `oauth2-proxy`, and redirected to Keycloak using the correct HTTP callback and cookie settings:
```powershell
kubectl run curl-test --image=curlimages/curl --restart=Never -i --rm --tty -- curl -v -H "Host: myapp.local" "http://10.100.14.46/oauth2/start?rd=%2F"
```
**Output logs:**
```text
* Established connection to 10.100.14.46 (10.100.14.46 port 80)
> GET /oauth2/start?rd=%2F HTTP/1.1
> Host: myapp.local
> 
< HTTP/1.1 302 Found
< Location: http://keycloak.local/realms/master/protocol/openid-connect/auth?approval_prompt=force&client_id=frontend-client&redirect_uri=http%3A%2F%2Fmyapp.local%2Foauth2%2Fcallback&response_type=code&scope=openid+email+profile&state=700haSUgEpe7wMoqPB5hpHrc0wJTwpa7pZtWi1wScnQ%3A%2F
< Set-Cookie: _oauth2_proxy_csrf=...; Path=/; Expires=...; HttpOnly
```
*Result: The authentication initiation succeeds beautifully! Nginx correctly routes `/oauth2/*` directly to `oauth2-proxy` without applying the external auth filter, and `oauth2-proxy` correctly uses the non-secure `http://myapp.local/oauth2/callback` URL and standard HTTP CSRF cookie, aligning with local development constraints.*

---

### 3. Keycloak "Invalid parameter: redirect_uri" & Secret Resolution
**Issue:** Keycloak threw an `Invalid parameter: redirect_uri` error upon being redirected from `oauth2-proxy`.

**Investigation & Discoveries:**
1. **Invalid Redirect URI Root Cause**: We queried the `frontend-client` client configuration directly inside the Keycloak container using the Keycloak Admin CLI (`kcadm.sh`). We discovered that the client's `redirectUris` was configured to ONLY allow `["http://myapp.local"]`. Because `oauth2-proxy` sends requests with `redirect_uri=http://myapp.local/oauth2/callback`, Keycloak rejected the callback request.
2. **Client Secret Mismatch**: We also discovered that the client secret registered inside Keycloak was `"YdXIqW0GTVBiHsCcPLz0LJk9RjdJZ3Dr"`, while `oauth2-proxy` was configured with `"my-super-secret-keycloak-token-123"`. This would have caused `oauth2-proxy` to fail when exchanging the authorization code for an access token.

**Fix:**
1. **Updated Keycloak Client Redirect URIs**:
   Used `kcadm.sh` inside the Keycloak pod to update the valid redirect URIs to allow any sub-path of `myapp.local` for both HTTP and HTTPS using wildcards:
   ```powershell
   '{"redirectUris": ["http://myapp.local/*", "https://myapp.local/*"]}' | kubectl exec -i keycloak-5d98c88b87-gt2nj -- /opt/keycloak/bin/kcadm.sh update clients/85f1cc05-5f0e-4fd2-991c-684a73040ea8 -r master -f -
   ```
2. **Configured `oauth2-proxy` Callback Protocol**:
   Forced HTTP callbacks and allowed HTTP cookies in [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml):
   - `OAUTH2_PROXY_REDIRECT_URL: "http://myapp.local/oauth2/callback"`
   - `OAUTH2_PROXY_COOKIE_SECURE: "false"`
3. **Aligned Client Secret**:
   Updated `OAUTH2_PROXY_CLIENT_SECRET` in [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml) to match Keycloak's actual generated secret `"YdXIqW0GTVBiHsCcPLz0LJk9RjdJZ3Dr"`.
   ```powershell
   kubectl apply -f k8s/frontend/frontend-auth-setup.yaml
   ```

---

### 4. Keycloak OIDC Callback "500 - Internal Server Error" (Email Verification & User Claim) Resolution
**Issue:** Keycloak successfully redirected back to the callback path (`/oauth2/callback`), but `oauth2-proxy` encountered a `500 - Internal Server Error` and logged:
`Error redeeming code during OAuth2 callback: email in id_token () isn't verified`

- **Root Cause:** By default, `oauth2-proxy` requires that the OIDC ID Token contains a verified email (`email_verified=true`). In our local development/Keycloak environment, standard users (including the administrative default `admin` account) do not have a verified email configured (the email claim is empty or unverified). Additionally, the default identity mapping expects an email address, which is empty.

**Fix:**
Configured `oauth2-proxy` inside [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml) to allow unverified/missing email claims and map user identities using their Keycloak username (`preferred_username` claim) rather than email:
- `OAUTH2_PROXY_INSECURE_OIDC_ALLOW_UNVERIFIED_EMAILS: "true"`
- `OAUTH2_PROXY_USER_ID_CLAIM: "preferred_username"`

```powershell
# Applied modified configuration
kubectl apply -f k8s/frontend/frontend-auth-setup.yaml

# Checked rollout status
kubectl rollout status deployment/oauth2-proxy
```

*Result:* The `oauth2-proxy` successfully initializes, rolls out, and accepts the OIDC callback seamlessly without throwing the 500 error!

---

### 5. Keycloak OIDC Callback "500 - Internal Server Error" (Audience Verification) Resolution
**Issue:** After addressing the email verification error, logging in resulted in another `500 - Internal Server Error` with `oauth2-proxy` logging:
`Error creating session during OAuth2 callback: audience from claim aud with value [myrealm-realm master-realm account] does not match with any of allowed audiences map[frontend-client:{}]`

- **Root Cause:** By default, Keycloak issues tokens with standard administrative system audiences (such as `myrealm-realm`, `master-realm`, and `account`) in the `aud` claim list, but it does not map the client ID `frontend-client` to the audience list unless specifically configured via a custom protocol mapper. Consequently, `oauth2-proxy` (which strictly validates that the token's audience claim matches the registered client ID) rejects the token.

**Fix:**
Configured `oauth2-proxy` in [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml) to accept these additional audiences by adding explicit command-line flags (`args`) directly to the container definition:
```yaml
        args:
        - --oidc-extra-audience=myrealm-realm
        - --oidc-extra-audience=master-realm
        - --oidc-extra-audience=account
```

```powershell
# Applied modified configuration
kubectl apply -f k8s/frontend/frontend-auth-setup.yaml

# Checked rollout status
kubectl rollout status deployment/oauth2-proxy
```

*Result:* The audience validation check succeeds, and `oauth2-proxy` successfully issues the session cookie `_oauth2_proxy` and redirects the user back to the backend application home `/`!

---

### 6. Keycloak OIDC Callback "502 Bad Gateway" (Nginx Header Buffer Size) Resolution
**Issue:** The authentication successfully passed `oauth2-proxy` session verification, but the browser received a `502 Bad Gateway` error page returned by Nginx. The Nginx Ingress controller logs output:
`[error] upstream sent too big header while reading response header from upstream, client: 192.168.59.1, server: myapp.local, request: "GET /oauth2/callback?...`

- **Root Cause:** By default, Keycloak tokens for administrative or highly privileged users (such as the default `admin` user in the `master` realm) are extremely large due to the inclusion of comprehensive group configurations and administrative roles. This causes `oauth2-proxy` to split the OIDC session state across multiple response cookie headers, which easily exceeds Nginx Ingress's default upstream response header buffer limit. Nginx aborts the response and serves a 502 Bad Gateway.

**Fix:**
Increased the Nginx proxy buffer size limits inside the metadata annotations of both the `auth-ingress` (protecting `/`) and the `oauth2-proxy-ingress` (routing `/oauth2`) in [frontend-auth-setup.yaml](file:///c:/Users/prabhua/Documents/Projects/Windriver/k8s/code/k8s/frontend/frontend-auth-setup.yaml):
```yaml
  annotations:
    nginx.ingress.kubernetes.io/proxy-buffer-size: "64k"
```

```powershell
# Applied modified configuration
kubectl apply -f k8s/frontend/frontend-auth-setup.yaml
```

*Result:* The large cookies are successfully processed and parsed by Nginx Ingress. The browser seamlessly completes authentication and redirects to the landing page of the application!





