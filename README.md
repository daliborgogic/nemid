# [POC] nemid

Download the file DanID Test (gyldig) under [Virksomhedscertifikater](https://www.nets.eu/dk-da/kundeservice/nemid-tjenesteudbyder/NemID-tjenesteudbyderpakken/Pages/OCES-II-certifikat-eksempler.aspx)

You got your `p12` certificate now generate `*.pem` files, use following commands:

Convert it to `certificate.pem`, use the password `Test1234`.

```bash
# public
openssl pkcs12 \
  -in certs/VOCES_gyldig.p12 \
  -out certs/public.pem \
  -clcerts \
  -nokeys
```

NOTE: Remove the initial lines with Bag Attributes if present.

Only the `-----BEGIN CERTIFICATE-----`, the `base64` encoded certificate and `-----END CERTIFICATE-----` are relevant.

```bash
# privateKey & privateKeyPassword
openssl pkcs12 \
  -in certs/VOCES_gyldig.p12 \
  -clcerts \
  -out certs/private.pem
```
