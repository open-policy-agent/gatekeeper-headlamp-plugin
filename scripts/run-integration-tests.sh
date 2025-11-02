#!/bin/bash
set -e

echo "========================================="
echo "Gatekeeper Plugin Integration Test Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="gatekeeper-test"
GATEKEEPER_VERSION="master"

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind is not installed${NC}"
    echo "Install kind from: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    echo "Install kubectl from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

echo -e "${YELLOW}Step 1: Creating kind cluster${NC}"
if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    echo "Cluster ${CLUSTER_NAME} already exists"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing cluster..."
        kind delete cluster --name ${CLUSTER_NAME}
        echo "Creating new cluster..."
        kind create cluster --name ${CLUSTER_NAME} --wait 2m
    fi
else
    echo "Creating new cluster..."
    kind create cluster --name ${CLUSTER_NAME} --wait 2m
fi

echo -e "${GREEN}✓ Cluster created${NC}"

echo -e "${YELLOW}Step 2: Installing Gatekeeper${NC}"
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/${GATEKEEPER_VERSION}/deploy/gatekeeper.yaml

echo "Waiting for Gatekeeper to be ready..."
kubectl wait --for=condition=Ready pod \
    -l control-plane=controller-manager \
    -n gatekeeper-system \
    --timeout=300s

kubectl wait --for=condition=Ready pod \
    -l control-plane=audit-controller \
    -n gatekeeper-system \
    --timeout=300s

echo -e "${GREEN}✓ Gatekeeper installed${NC}"

echo -e "${YELLOW}Step 3: Installing test ConstraintTemplates${NC}"
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/requiredlabels/template.yaml

# Wait for template to be created
sleep 5

echo -e "${GREEN}✓ Test templates installed${NC}"

echo -e "${YELLOW}Step 4: Verifying installation${NC}"
echo "Gatekeeper pods:"
kubectl get pods -n gatekeeper-system

echo -e "\nConstraintTemplates:"
kubectl get constrainttemplates

echo -e "${GREEN}✓ Installation verified${NC}"

echo -e "\n${YELLOW}Step 5: Running integration tests${NC}"
npm run test:integration

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}Integration tests completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"

echo -e "\n${YELLOW}Cluster Information:${NC}"
echo "Cluster name: ${CLUSTER_NAME}"
echo "To interact with the cluster:"
echo "  kubectl cluster-info --context kind-${CLUSTER_NAME}"
echo ""
echo "To delete the cluster when done:"
echo "  kind delete cluster --name ${CLUSTER_NAME}"
