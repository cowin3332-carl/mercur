#!/bin/sh
curl -f http://localhost:9000/health || exit 1
