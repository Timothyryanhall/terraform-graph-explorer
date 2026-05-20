# Sample plans

The two-button hand-crafted samples (`sample-vpc.json`, `sample-app-stack.json`) live in `public/` and are written to match `terraform show -json` shape exactly, but they're authored by hand for illustration.

The third sample, `sample-tls-bundle.json`, is real `terraform show -json` output — the source for it is here. Regenerate any time with:

```bash
cd samples/tls-bundle
terraform init
terraform plan -out=tfplan
terraform show -json tfplan > ../../public/sample-tls-bundle.json
```

It uses credential-free providers (random / tls / local / archive / null), so it runs anywhere without an AWS account.
