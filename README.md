# User Profile Management Fullstack App

This is a Fullstack Java + React application running natively within a Kubernetes Minikube configuration. It integrates a Spring Boot backend, a Vite/React frontend, and utilizes an pre-existing Minikube-hosted PostgreSQL service.

## Architecture

- **Backend:** Java 17, Spring Boot, Spring Data JPA, PostgreSQL Driver
- **Frontend:** React + Vite, TailwindCSS
- **Database:** PostgreSQL (Assumed running natively in minikube as `postgres-service:5432`)
- **Infrastructure:** Kubernetes (Minikube)

## Prerequisites
- **Minikube**: Using the VirtualBox driver.
- **kubectl**: Configured to interface with your Minikube cluster.

## 1. Building and Deploying to Minikube

Because standard Docker binaries are unattached, you must build the docker images directly utilizing Minikube's internal container engine. 

### Automated Deployment (Windows)
We've provided a batch script which simplifies the pipeline:
```cmd
.\deploy.bat
```

### Manual Step-by-Step Deployment
If you prefer running commands manually to isolate potential failures:

1. **Build the Backend Container:**
   ```powershell
   minikube image build -t application-backend:latest ./backend
   ```
2. **Build the Frontend Container:**
   *(Note: Vite Node builds process heavy dependencies. Ensure your Minikube VirtualBox has adequate memory).*
   ```powershell
   minikube image build -t application-frontend:latest ./frontend
   ```

3. **Establish Deployments and Services:**
   ```powershell
   kubectl apply -f k8s/backend/backend-deployment.yaml
   kubectl apply -f k8s/backend/backend-service.yaml
   kubectl apply -f k8s/frontend/frontend-deployment.yaml
   kubectl apply -f k8s/frontend/frontend-service.yaml
   ```

## 2. Accessing the Application
Once the images are prepared properly and deployed, monitor your pod cluster:
```powershell
kubectl get pods
```

Map the application node port directly into your web browser:
```powershell
minikube service frontend-service
```

## 3. Resolving the `ErrImageNeverPull` Pod Failure

If you notice your pod waiting indefinitely with an `ErrImageNeverPull` status (frequently accompanying VirtualBox Minikube instances), follow these steps:
- **Core Cause:** The `minikube image build` silently failed during configuration for the image (commonly due to Out of Memory kills inside the VM). The deployment attempts to pull `application-frontend:latest` using `imagePullPolicy: Never` but it cannot be found.
- **The Fix:** Restart your minikube instance granting it higher memory specifications and rebuild the image directly.
   ```powershell
   minikube stop
   minikube start --memory=4096 --driver=virtualbox
   minikube image build -t application-frontend:latest ./frontend
   ```
   Check the output of the build command to ensure no `Exit Code: 1` failure happens.

For more tracing, check pod-specific activities via:
```powershell
kubectl logs -l app=backend
kubectl logs -l app=frontend
```
