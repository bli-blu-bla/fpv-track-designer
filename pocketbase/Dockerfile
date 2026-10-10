FROM alpine:3.22

# Pinned PocketBase release. JSVM hooks/migrations target this version's API; read the docs/changelog before bumping.
ARG PB_VERSION=0.40.5
ARG PB_SHA256_AMD64=1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4
ARG PB_SHA256_ARM64=570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3
ARG TARGETARCH=amd64

RUN apk add --no-cache ca-certificates unzip wget \
  && case "$TARGETARCH" in \
       amd64) PB_SHA256="$PB_SHA256_AMD64" ;; \
       arm64) PB_SHA256="$PB_SHA256_ARM64" ;; \
       *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
     esac \
  && wget -q -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
  && echo "${PB_SHA256}  /tmp/pb.zip" | sha256sum -c - \
  && unzip /tmp/pb.zip pocketbase -d /pb \
  && rm /tmp/pb.zip \
  && apk del unzip wget

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

# Comma-separated CORS origins, e.g. "https://trackdesigner.fpvooe.com,https://sharedtrack.fpvooe.com". Empty = allow all (local only).
ENV PB_ORIGINS=""

VOLUME /pb/pb_data
EXPOSE 8090

# `serve` applies pending migrations on start.
CMD ["sh", "-c", "exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations ${PB_ORIGINS:+--origins=$PB_ORIGINS}"]
