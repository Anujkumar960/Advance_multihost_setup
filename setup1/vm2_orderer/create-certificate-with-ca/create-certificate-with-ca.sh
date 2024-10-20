createCretificateForOrderer() {

  local CA_PORT=$1         # CA port (e.g., 11054)
  local DOMAIN=$2  # Organization domain (e.g., example.com)
  
  # Variables For Ordereres
  orderers=("orderer4" "orderer5" "orderer6")
  ordererSecret="ordererpw"

  echo
  echo "Enroll the CA admin for orderers"
  echo
  mkdir -p ../crypto-config/ordererOrganizations/${DOMAIN}

  export FABRIC_CA_CLIENT_HOME=${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}

  # Enroll the CA Admin (default username: admin, password: adminpw)
  if ! fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_PORT} --caname ca-orderer --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem; then
      echo "ERROR: Failed to enroll CA admin of orderers"
      exit 1
  fi

  # Step 2: Create MSP (Membership Service Provider) config file
  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-'${CA_PORT}'-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer' >${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/msp/config.yaml


  # Registering the Orderers

  for orderer in "${orderers[@]}"; do
    echo "Registering $orderer..."
    if fabric-ca-client register --caname ca-orderer --id.name $orderer --id.secret $ordererSecret --id.type orderer --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem; then
      echo "Successfully registered $orderer."
    else
      echo "Error registering $orderer. Exiting."
    exit 1
    fi
  done

  echo "All orderers registered."

  # Register to orderer Admin
  echo
  echo "Register the orderer admin"
  echo
  if ! fabric-ca-client register --caname ca-orderer --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem; then
      echo "ERROR: Failed to register orderer admin"
      exit 1
  fi

  mkdir -p ../crypto-config/ordererOrganizations/${DOMAIN}/orderers
  # mkdir -p ../crypto-config/ordererOrganizations/${DOMAIN}/orderers/${DOMAIN}

  # ---------------------------------------------------------------------------
  #  Orderer Registration

  for orderer in "${orderers[@]}"; do
  ordererDomain="$orderer.${DOMAIN}"
  
  # Create directories
  mkdir -p "../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain"
  
  echo
  echo "## Generate the $orderer msp"
  
  # Generate MSP
  if ! fabric-ca-client enroll -u https://$orderer:$ordererSecret@localhost:${CA_PORT} --caname ca-orderer -M "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/msp" --csr.hosts "$ordererDomain" --csr.hosts localhost --tls.certfiles "${PWD}/fabric-ca/ordererOrg/tls-cert.pem"; then
      echo "ERROR: Failed to generate $orderer msp"
      exit 1
  fi
  
  cp "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/msp/config.yaml" "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/msp/config.yaml"

  echo
  echo "## Generate the $orderer-tls certificates"
  
  # Generate TLS certificates
  if ! fabric-ca-client enroll -u https://$orderer:$ordererSecret@localhost:${CA_PORT} --caname ca-orderer -M "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls" --enrollment.profile tls --csr.hosts "$ordererDomain" --csr.hosts localhost --tls.certfiles "${PWD}/fabric-ca/ordererOrg/tls-cert.pem"; then
      echo "ERROR: Failed to generate $orderer-tls certificates"
      exit 1
  fi

  cp "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/tlscacerts/"* "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/ca.crt"
  cp "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/signcerts/"* "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/server.crt"
  cp "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/keystore/"* "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/server.key"

  mkdir -p "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/msp/tlscacerts"
  cp "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/tlscacerts/"* "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/msp/tlscacerts/tlsca.${DOMAIN}-cert.pem"

  mkdir -p "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/msp/tlscacerts"
  cp "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/orderers/$ordererDomain/tls/tlscacerts/"* "${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/msp/tlscacerts/tlsca.${DOMAIN}-cert.pem"
  done

  echo "All orderers registered and certificates generated."

 
  # -----------------------------------------------------------------------

  mkdir -p ../crypto-config/ordererOrganizations/${DOMAIN}/users
  mkdir -p ../crypto-config/ordererOrganizations/${DOMAIN}/users/Admin@${DOMAIN}

  echo
  echo "## Generate the admin msp"
  echo

  if ! fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:${CA_PORT} --caname ca-orderer -M ${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem; then
     echo "ERROR: Failed to generate admin msp"
     exit 1
  fi

  cp ${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/msp/config.yaml ${PWD}/../crypto-config/ordererOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp/config.yaml

}

createCretificateForOrderer 11054 "example.com"

