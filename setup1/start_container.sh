#!/bin/bash

# Combined function to start all containers: orderer, org1, org2
start_all_containers_vm1() {
    # Start vm1_orderer containers
    echo "Starting vm1_orderer containers..."
    cd vm1_orderer || exit
    docker-compose up -d
    echo "vm1_orderer containers started."
    sleep 10  # Allow time for the orderer to initialize

    # Start vm1_org1 containers
    echo "Starting vm1_org1 containers..."
    cd ../vm1_org1 || exit
    docker-compose up -d
    echo "vm1_org1 containers started."
    sleep 10  # Allow Org1 peers to initialize

    # Start vm1_org2 containers
    echo "Starting vm1_org2 containers..."
    cd ../vm1_org2 || exit
    docker-compose up -d
    echo "vm1_org2 containers started."
    sleep 10  # Allow Org2 peers to initialize

    echo "All containers are up and running."
}



start_all_containers_vm2() {
    # Start vm1_orderer containers
    echo "Starting vm2_orderer containers..."
    cd ../vm2_orderer || exit
    docker-compose up -d
    echo "vm2_orderer containers started."
    sleep 10 

    # Start vm1_org1 containers
    echo "Starting vm2_org3 containers..."
    cd ../vm2_org3 || exit
    docker-compose up -d
    echo "vm2_org3 containers started."
    sleep 10  

    echo "All containers are up and running."
}
# Call the function to start all containers
start_all_containers_vm1
start_all_containers_vm2

# For Running the script
# chmod +x startContainers.sh
# ./startContainers.sh