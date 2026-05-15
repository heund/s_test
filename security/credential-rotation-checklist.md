# Credential Rotation Checklist

## Summary

Current npm supply-chain compromise scan results did not confirm direct infection on this machine.

This checklist is precautionary. It is intended for manual review after recent npm ecosystem incidents and after using AI coding tools that may have installed packages broadly.

Actual credential rotation, revocation, deletion, or replacement should be performed manually by the user in each provider console or local tool. Do not paste real secrets into prompts, public repositories, issue trackers, or chat logs.

## Highest Priority Credentials to Review

- npm tokens
- GitHub personal access tokens, both classic and fine-grained
- GitHub CLI authentication
- Railway tokens and project environment variables
- OpenAI API keys
- Deployment platform tokens such as Vercel, Render, and Cloudflare
- Any `.env` files used in active projects
- SSH keys, if present

## Medium Priority Credentials to Review

- Google, Firebase, and Supabase keys
- Hugging Face tokens
- Docker Hub tokens
- Discord and Slack webhook URLs
- Stripe or other payment API keys, if any
- Gmail app passwords, if any

## Local File Search Checklist

Manually search active project folders and private notes for accidental secrets:

- `.env`
- `.env.local`
- `.npmrc`
- Shell history files such as `.bash_history`, PowerShell history, `.zsh_history`
- Git config files such as `.gitconfig` and repository `.git/config`
- Project README files
- Notes files where tokens may have been pasted
- Package manager lockfiles as dependency evidence only, not usually as secret files

## Git Repository Secret Hygiene

- Confirm `.env` files are ignored.
- Confirm no secrets are committed.
- Confirm no secrets appear in Git history.
- Use secret scanning before any public push.
- Rotate any token that was ever committed, even if it was later deleted.

## Current `fan-control-test` Project Checklist

- Confirm `.env` is gitignored.
- Confirm `ADMIN_TOKEN` stays local only.
- Confirm `DEVICE_TOKEN` stays local only.
- Confirm `esp32/` is gitignored.
- Confirm Arduino sketch with Wi-Fi credentials is not committed.
- Confirm `README.md` is gitignored if requested.
- Confirm `server/data/state.json` and `server/data/logs.jsonl` are gitignored.
- Confirm logs never print full tokens.
- Confirm admin and device auth stays bearer-token based.
- Confirm ESP32 remains outbound-only and does not host a web server.

## Rotation Priority Table

| Credential / Secret | Where to check | Rotate now? | Notes | Done |
|---|---|---|---|---|
| npm tokens | npm account security page, `npm token list` | Yes if any token exists or npm was used on this machine | Revoke unused tokens; recreate with least privilege | [ ] |
| GitHub personal access tokens | GitHub Settings, Developer settings, Personal access tokens | Yes for tokens used on this machine | Prefer fine-grained tokens with expiry | [ ] |
| GitHub CLI auth | `gh auth status`, GitHub Authorized OAuth Apps | Consider | Re-auth after revoking old OAuth/device tokens | [ ] |
| Railway tokens | Railway account settings and project variables | Yes if exposed locally or pasted anywhere | Update project env vars after rotation | [ ] |
| Railway project env vars | Railway service Variables tab | Review | Especially `ADMIN_TOKEN` and `DEVICE_TOKEN` | [ ] |
| OpenAI API keys | OpenAI dashboard API keys | Yes if stored in any project `.env` | Create new key, update apps, revoke old key | [ ] |
| Vercel tokens | Vercel account tokens and project env vars | Review | Rotate if used in local scripts or CI | [ ] |
| Render tokens | Render account/API keys and env vars | Review | Rotate if used in local scripts or CI | [ ] |
| Cloudflare tokens | Cloudflare API Tokens page | Review | Prefer scoped tokens with expiry | [ ] |
| Active project `.env` files | Local active project roots | Review all | Replace any old or overbroad keys | [ ] |
| SSH private keys | `~/.ssh/id_*` if present | Rotate if exposed, copied, or committed | Add new public key before removing old one | [ ] |
| AWS IAM access keys | AWS IAM console | Rotate if present on local machine | Prefer SSO or temporary credentials | [ ] |
| AWS RDS passwords | AWS RDS console or secret manager | Rotate if stored in `.env` | Update apps and restart services | [ ] |
| Google/Firebase keys | Google Cloud Console, Firebase console | Review | Restrict by API, app, domain, and quota | [ ] |
| Supabase keys | Supabase project API settings | Review | Rotate service role keys if stored locally | [ ] |
| Hugging Face tokens | Hugging Face account tokens | Review | Revoke unused write tokens | [ ] |
| Docker Hub tokens | Docker Hub account security | Review | Rotate tokens used by CI or local scripts | [ ] |
| Discord webhook URLs | Discord server integrations | Rotate if stored in repo or logs | Webhooks act like secrets | [ ] |
| Slack webhook URLs | Slack app management | Rotate if stored in repo or logs | Webhooks act like secrets | [ ] |
| Stripe/payment API keys | Provider dashboard | High if present locally | Use test/live separation and restricted keys | [ ] |
| Gmail app passwords | Google account security | Rotate if present | Prefer OAuth where possible | [ ] |
| KakaoTalk API keys | Kakao Developers console | Review | Rotate if stored in `.env` or notes | [ ] |
| Coupang Partners API keys | Coupang Partners console | Review | Rotate if stored in `.env` or notes | [ ] |

## Post-Rotation Notes

- Update local `.env` files after rotating credentials.
- Update Railway environment variables after rotating deployed project secrets.
- Restart or redeploy the deployed service after changing environment variables.
- Never paste real secrets into prompts or public repositories.
- Keep `npm config ignore-scripts=true` as a temporary defensive default unless a project explicitly needs install scripts.
- For any project that needs install scripts, allow only the required package builds and document why.
