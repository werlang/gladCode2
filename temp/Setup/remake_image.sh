#!/bin/bash

rm -rf /var/lib/docker/

service docker restart

docker build -t 'virtual_machine' - < Dockerfile

