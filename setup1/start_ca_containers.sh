start_all_ca_containers_vm1() {
    echo "===================================="
    echo "Starting vm1_orderer CA containers..."
    cd vm1_orderer/create-certificate-with-ca || { echo "Error: Failed to navigate to vm1_orderer/create-certificate-with-ca"; exit 1; }
    sudo chmod -R 777 * 
    docker-compose up -d
    echo "Generating certificates for vm1_orderer..."
    ./create-certificate-with-ca.sh
    echo "Success: vm1_orderer CA containers started and certificates generated."
    sleep 10

    echo "===================================="
    echo "Starting vm1_org1 CA containers..."
    cd ../../vm1_org1/create-certificate-with-ca || { echo "Error: Failed to navigate to vm1_org1/create-certificate-with-ca"; exit 1; }
    sudo chmod -R 777 * 
    docker-compose up -d
    echo "Generating certificates for vm1_org1..."
    ./create-certificate-with-ca.sh
    echo "Success: vm1_org1 CA containers started and certificates generated."
    sleep 10

    echo "===================================="
    echo "Starting vm1_org2 CA containers..."
    cd ../../vm1_org2/create-certificate-with-ca || { echo "Error: Failed to navigate to vm1_org2/create-certificate-with-ca"; exit 1; }
    sudo chmod -R 777 * 
    docker-compose up -d
    echo "Generating certificates for vm1_org2..."
    ./create-certificate-with-ca.sh
    echo "Success: vm1_org2 CA containers started and certificates generated."
    sleep 10

    echo "===================================="
    echo "All CA containers for vm1 are up and running."
    echo "===================================="
}

start_all_ca_containers_vm2() {
    echo "===================================="
    echo "Starting vm2_orderer CA containers..."
    cd ../../vm2_orderer/create-certificate-with-ca || { echo "Error: Failed to navigate to vm2_orderer/create-certificate-with-ca"; exit 1; }
    sudo chmod -R 777 * 
    docker-compose up -d
    echo "Generating certificates for vm2_orderer..."
    ./create-certificate-with-ca.sh
    echo "Success: vm2_orderer CA containers started and certificates generated."
    sleep 10

    echo "===================================="
    echo "Starting vm2_org3 CA containers..."
    cd ../../vm2_org3/create-certificate-with-ca || { echo "Error: Failed to navigate to vm2_org3/create-certificate-with-ca"; exit 1; }
    sudo chmod -R 777 * 
    docker-compose up -d
    echo "Generating certificates for vm2_org3..."
    ./create-certificate-with-ca.sh
    echo "Success: vm2_org3 CA containers started and certificates generated."
    sleep 10

    echo "===================================="
    echo "All CA containers for vm2 are up and running."
    echo "===================================="
}

# Call the function to start all containers
start_all_ca_containers_vm1
start_all_ca_containers_vm2

# For Running the script
# chmod +x startContainers.sh
# ./start_ca_Containers.sh

