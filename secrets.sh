#!/bin/bash
# This script sets the necessary secrets for the Cloudflare Worker and redeploys it.
# Please run this script from within the 'backend' directory.

echo "Setting ADMIN_PASSWORD secret..."
# When prompted below, please enter: 0600231590mM@
npx wrangler secret put ADMIN_PASSWORD

echo "Setting ADMIN_TOKEN secret..."
# The token is returned after login and used for API access.
# For setup, you can use the same value as the password or any secure random string.
# When prompted below, please enter: 0600231590mM@
npx wrangler secret put ADMIN_TOKEN

echo "Redeploying the worker to apply the new secrets..."
npx wrangler deploy
