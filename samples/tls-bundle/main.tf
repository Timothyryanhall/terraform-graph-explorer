terraform {
  required_providers {
    random  = { source = "hashicorp/random",  version = "~> 3.6" }
    local   = { source = "hashicorp/local",   version = "~> 2.5" }
    tls     = { source = "hashicorp/tls",     version = "~> 4.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.4" }
    null    = { source = "hashicorp/null",    version = "~> 3.2" }
  }
}

resource "random_pet" "service_name" {
  length    = 2
  separator = "-"
}

resource "random_id" "deploy" {
  byte_length = 4
}

resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem
  subject {
    common_name  = random_pet.service_name.id
    organization = "Internal CA"
  }
  validity_period_hours = 8760
  is_ca_certificate     = true
  allowed_uses          = ["cert_signing", "crl_signing"]
}

resource "tls_private_key" "service" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "service" {
  private_key_pem = tls_private_key.service.private_key_pem
  subject {
    common_name = "${random_pet.service_name.id}.internal"
  }
}

resource "tls_locally_signed_cert" "service" {
  cert_request_pem      = tls_cert_request.service.cert_request_pem
  ca_private_key_pem    = tls_private_key.ca.private_key_pem
  ca_cert_pem           = tls_self_signed_cert.ca.cert_pem
  validity_period_hours = 720
  allowed_uses          = ["server_auth", "key_encipherment"]
}

resource "local_file" "ca_cert" {
  filename = "/tmp/tf-real-plan-out/${random_id.deploy.hex}/ca.pem"
  content  = tls_self_signed_cert.ca.cert_pem
}

resource "local_file" "service_cert" {
  filename = "/tmp/tf-real-plan-out/${random_id.deploy.hex}/service.pem"
  content  = tls_locally_signed_cert.service.cert_pem
}

resource "local_file" "service_key" {
  filename        = "/tmp/tf-real-plan-out/${random_id.deploy.hex}/service.key"
  content         = tls_private_key.service.private_key_pem
  file_permission = "0600"
}

resource "archive_file" "bundle" {
  type        = "zip"
  output_path = "/tmp/tf-real-plan-out/${random_id.deploy.hex}/bundle.zip"
  source {
    content  = local_file.ca_cert.content
    filename = "ca.pem"
  }
  source {
    content  = local_file.service_cert.content
    filename = "service.pem"
  }
  source {
    content  = local_file.service_key.content
    filename = "service.key"
  }
}

resource "null_resource" "deploy_marker" {
  triggers = {
    service_name = random_pet.service_name.id
    deploy_id    = random_id.deploy.hex
    bundle_sha   = archive_file.bundle.output_sha256
  }
}
