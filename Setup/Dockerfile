# Engine image (gladcode2-vm): the battle server and the gladiators' toolchains.
# C (gcc 4.8) and Python (3.4) come from Ubuntu 14.04 and stay as they are, so saved gladiators
# keep compiling the same way.
# JavaScript runs on Node.js 22 copied from the official Alpine image with its musl loader and
# libraries: the musl loader goes to /lib (where node's ELF header looks for it) and finds the
# libraries in /opt/node/lib through /etc/ld-musl-<arch>.path, so nothing touches the glibc
# system and the same file builds on x86_64 and arm64.
# pinned so every host builds the same Node (and musl libraries)
FROM node:22.23.4-alpine3.24 AS node
RUN mkdir -p /opt/node/bin /opt/node/lib /opt/node/etc \
    && cp /usr/local/bin/node /opt/node/bin/node \
    && cp /lib/ld-musl-*.so.1 /opt/node/lib/ \
    && for lib in $(ldd /usr/local/bin/node | awk '/=>/ { print $3 }'); do cp -L "$lib" /opt/node/lib/; done \
    && loader=$(basename /lib/ld-musl-*.so.1) \
    && arch=${loader#ld-musl-} \
    && echo /opt/node/lib > "/opt/node/etc/ld-musl-${arch%.so.1}.path"

FROM ubuntu:14.04
RUN apt-get update

RUN apt-get install -y gcc
RUN apt-get install -y g++
RUN apt-get install -y python3

COPY --from=node /opt/node /opt/node
RUN cp /opt/node/lib/ld-musl-*.so.1 /lib/ \
    && cp /opt/node/etc/ld-musl-*.path /etc/ \
    && ln -s /opt/node/bin/node /usr/local/bin/node \
    && node --version
