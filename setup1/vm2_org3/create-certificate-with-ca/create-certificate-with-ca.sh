createCertificatesForOrg3(){
  # Input parameters
  local ORG=$1              # Organization name (e.g., Org2)
  local ORG_DOMAIN=$2       # Organization domain (e.g., example.com)
  local CA_PORT=$3          # CA port (e.g., 8054)
  local CA_NAME=ca.${ORG}.${ORG_DOMAIN}  # CA server name (e.g., ca.org2.example.com)
  local MAIN_DOMAIN=$4

  echo
  echo "==> Enrolling the CA admin for organization: $ORG"
  echo

  # Step 1: Set up directories for storing certificates
  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/
  
  # Set the Fabric CA client home
  export FABRIC_CA_CLIENT_HOME=${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/

  # Enroll the CA Admin (default username: admin, password: adminpw)
  if ! fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_PORT} --caname ${CA_NAME} --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to enroll CA admin for ${ORG}"
    exit 1
  fi

  # Step 2: Create MSP (Membership Service Provider) config file
  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-'${ORG}'-'${MAIN_DOMAIN}'-com.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-'${ORG}'-'${MAIN_DOMAIN}'-com.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-'${ORG}'-'${MAIN_DOMAIN}'-com.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-'${ORG}'-'${MAIN_DOMAIN}'-com.pem
    OrganizationalUnitIdentifier: orderer' > ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/msp/config.yaml

  echo
  echo "==> Registering peers and users for $ORG"
  echo

  # Step 3: Register peer0
  if ! fabric-ca-client register --caname ${CA_NAME} --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to register peer0 for ${ORG}"
    exit 1
  fi

  # Step 4: Register peer1
  if ! fabric-ca-client register --caname ${CA_NAME} --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to register peer1 for ${ORG}"
    exit 1
  fi

  # Step 5: Register user1
  if ! fabric-ca-client register --caname ${CA_NAME} --id.name user1 --id.secret user1pw --id.type client --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to register user1 for ${ORG}"
    exit 1
  fi

  # Step 6: Register org admin
  if ! fabric-ca-client register --caname ${CA_NAME} --id.name ${ORG}admin --id.secret ${ORG}adminpw --id.type admin --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to register the org admin for ${ORG}"
    exit 1
  fi

  # Step 7: Create directories for peer certificates
  echo
  echo "==> Generating certificates for peer0 and peer1"
  echo

  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers

  # Generate peer0 MSP
  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}

  if ! fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_PORT} --caname ${CA_NAME} -M ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/msp --csr.hosts peer0.${ORG}.${ORG_DOMAIN} --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to generate peer0 MSP for ${ORG}"
    exit 1
  fi

  # Copy the config.yaml file to the peer's MSP folder
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/msp/config.yaml ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/msp/config.yaml

  # Generate peer0 TLS certificates
  if ! fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_PORT} --caname ${CA_NAME} -M ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls --enrollment.profile tls --csr.hosts peer0.${ORG}.${ORG_DOMAIN} --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to generate peer0 TLS certificates for ${ORG}"
    exit 1
  fi

  # Copy the TLS files
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/tlscacerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/ca.crt
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/signcerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/server.crt
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/keystore/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/server.key

  # Additional setups for tlscacerts and ca directories
  mkdir -p ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/msp/tlscacerts
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/tlscacerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/msp/tlscacerts/ca.crt

  mkdir -p ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/tlsca
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/tls/tlscacerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/tlsca/tlsca.${ORG}.${ORG_DOMAIN}-cert.pem

  mkdir -p ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/ca
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer0.${ORG}.${ORG_DOMAIN}/msp/cacerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/ca/ca.${ORG}.${ORG_DOMAIN}-cert.pem


  # # Generate peer1 MSP
  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}

  # peer1 MSP
  if ! fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_PORT} --caname ${CA_NAME} -M ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/msp --csr.hosts peer1.${ORG}.${ORG_DOMAIN} --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to generate peer1 MSP for ${ORG}"
    exit 1
  fi

  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/msp/config.yaml ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/msp/config.yaml

  # peer1 tls certificate
  if ! fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_PORT} --caname ${CA_NAME} -M ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls --enrollment.profile tls --csr.hosts peer1.${ORG}.${ORG_DOMAIN} --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem; then
    echo "ERROR: Failed to generate peer1 TLS certificates for ${ORG}"
    exit 1
  fi

  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls/tlscacerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls/ca.crt
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls/signcerts/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls/server.crt
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls/keystore/* ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/peers/peer1.${ORG}.${ORG_DOMAIN}/tls/server.key


  # Generate certificates for user1
  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/users
  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/users/User1@${ORG}.${ORG_DOMAIN} || error_exit "Failed to create user1 directory"

  echo "## Generate the user1 msp"
  fabric-ca-client enroll -u https://user1:user1pw@localhost:${CA_PORT} --caname ${CA_NAME} -M ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/users/User1@${ORG}.${ORG_DOMAIN}/msp --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem || error_exit "Failed to generate user1 msp"

  # Generate certificates for the org admin
  mkdir -p ../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/users/Admin@${ORG}.${ORG_DOMAIN} || error_exit "Failed to create org admin directory"

  echo "## Generate the ${ORG} admin msp"
  fabric-ca-client enroll -u https://${ORG}admin:${ORG}adminpw@localhost:${CA_PORT} --caname ${CA_NAME} -M ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/users/Admin@${ORG}.${ORG_DOMAIN}/msp --tls.certfiles ${PWD}/fabric-ca/${ORG}/tls-cert.pem || error_exit "Failed to generate org admin msp"

  echo "Certificates for ${ORG} have been generated successfully"
  cp ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/msp/config.yaml ${PWD}/../crypto-config/peerOrganizations/${ORG}.${ORG_DOMAIN}/users/Admin@${ORG}.${ORG_DOMAIN}/msp/config.yaml

}
createCertificatesForOrg3 "org3" "example.com" 10054 "example"

