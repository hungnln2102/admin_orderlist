FROM lscr.io/linuxserver/chromium:latest

RUN apt-get update \
    && apt-get install -y --no-install-recommends socat \
    && rm -rf /var/lib/apt/lists/*

COPY --chmod=755 cdp-relay.sh /custom-services.d/warehouse-cdp-relay
