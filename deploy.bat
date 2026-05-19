@echo off
echo Building Docker Images securely inside Minikube context...
minikube image build -t application-backend:latest ./backend
minikube image build -t application-frontend:latest ./frontend

echo Deploying Backend...
kubectl apply -f k8s/backend/backend-deployment.yaml
kubectl apply -f k8s/backend/backend-service.yaml

echo Deploying Frontend...
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

echo To access the frontend, run: 
echo minikube service frontend-service
