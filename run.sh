#!/bin/bash
node . &
HOST=0.0.0.0 node web-frontend/dist/server/entry.mjs &

# Wait for either process to exit
wait -n 

# Exit with status code of process that first exited
exit $?
