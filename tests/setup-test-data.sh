#!/bin/bash
# Setup test data in local D1 for mock upstream testing
# All channels point to http://localhost:9999

MOCK="http://localhost:9999"

echo "Setting up test channels and tokens..."

# Channel: openai type
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO channel_config (key, value) VALUES ('test-openai', '{\"name\":\"test-openai\",\"type\":\"openai\",\"endpoint\":\"$MOCK\",\"api_key\":\"mock-key\",\"deployment_mapper\":{\"gpt-4o\":\"gpt-4o\",\"gpt-4\":\"gpt-4\"}}')"

# Channel: azure-openai type
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO channel_config (key, value) VALUES ('test-azure', '{\"name\":\"test-azure\",\"type\":\"azure-openai\",\"endpoint\":\"$MOCK\",\"api_key\":\"mock-key\",\"api_version\":\"2024-02-01\",\"deployment_mapper\":{\"gpt-4o-azure\":\"gpt-4o-deployment\"}}')"

# Channel: claude type
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO channel_config (key, value) VALUES ('test-claude', '{\"name\":\"test-claude\",\"type\":\"claude\",\"endpoint\":\"$MOCK\",\"api_key\":\"mock-key\",\"deployment_mapper\":{\"claude-3-opus\":\"claude-3-opus-20240229\"}}')"

# Channel: claude-to-openai type
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO channel_config (key, value) VALUES ('test-c2o', '{\"name\":\"test-c2o\",\"type\":\"claude-to-openai\",\"endpoint\":\"$MOCK\",\"api_key\":\"mock-key\",\"deployment_mapper\":{\"claude-via-openai\":\"claude-3-opus\"}}')"

# Channel: openai-responses type
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO channel_config (key, value) VALUES ('test-responses', '{\"name\":\"test-responses\",\"type\":\"openai-responses\",\"endpoint\":\"$MOCK\",\"api_key\":\"mock-key\",\"deployment_mapper\":{\"gpt-4o-resp\":\"gpt-4o\"}}')"

# Channel: azure-openai-responses type
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO channel_config (key, value) VALUES ('test-azure-resp', '{\"name\":\"test-azure-resp\",\"type\":\"azure-openai-responses\",\"endpoint\":\"$MOCK\",\"api_key\":\"mock-key\",\"api_version\":\"2025-01-01\",\"deployment_mapper\":{\"gpt-4o-azure-resp\":\"gpt-4o-deployment\"}}')"

# Token: access to all test channels only
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO api_token (key, value, usage) VALUES ('sk-mock-all', '{\"name\":\"mock-all\",\"channel_keys\":[\"test-openai\",\"test-azure\",\"test-claude\",\"test-c2o\",\"test-responses\",\"test-azure-resp\"],\"total_quota\":99999999}', 0)"

# Token: limited to openai only
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO api_token (key, value, usage) VALUES ('sk-mock-openai', '{\"name\":\"mock-openai\",\"channel_keys\":[\"test-openai\"],\"total_quota\":99999999}', 0)"

# Token: quota almost full
npx wrangler d1 execute awsl-one-api --local --command "INSERT OR REPLACE INTO api_token (key, value, usage) VALUES ('sk-mock-quota', '{\"name\":\"mock-quota\",\"channel_keys\":[\"test-openai\"],\"total_quota\":100}', 99)"

echo "Test data setup complete!"
