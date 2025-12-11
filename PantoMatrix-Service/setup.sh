#!/bin/bash

# Setup script for PantoMatrix Service
# This script clones and sets up PantoMatrix repository

set -e

echo "Setting up PantoMatrix Service..."

# Check if PantoMatrix directory exists
if [ -d "PantoMatrix" ]; then
    echo "PantoMatrix directory already exists. Skipping clone."
else
    echo "Cloning PantoMatrix repository..."
    git clone https://github.com/PantoMatrix/PantoMatrix.git
    cd PantoMatrix
    
    echo "Running PantoMatrix setup..."
    bash setup.sh
    
    cd ..
fi

echo "Installing Python service dependencies..."
pip install -r requirements.txt

echo ""
echo "========================================="
echo "Setup complete!"
echo "========================================="
echo ""
echo "To start the service:"
echo "  python app.py"
echo ""
echo "Or with Docker:"
echo "  docker build -t pantomatrix-service ."
echo "  docker run -p 8081:8081 pantomatrix-service"
echo ""
echo "Service will be available at: http://localhost:8081"
echo "API docs: http://localhost:8081/docs"
echo ""
