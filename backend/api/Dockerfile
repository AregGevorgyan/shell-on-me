# prereq: first do `bun run build` to compile typescript & etc.

FROM node:20-alpine
WORKDIR /usr/src/app

# first get dependencies in for efficient docker layering
COPY dist/package.json dist/bun.lock ./
RUN npm install --omit=dev

# then copy over typescript payload
COPY dist ./

EXPOSE 80/tcp

CMD ["node", "--max-old-space-size=400", "backend/api/lib/serve.js"]
