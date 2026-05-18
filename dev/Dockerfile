FROM node:20-alpine

WORKDIR /workspace/dev

COPY . /workspace

RUN npm install --prefix /workspace --no-package-lock
RUN npm install --prefix /workspace/dev --no-package-lock
RUN npm --prefix /workspace/dev run build

EXPOSE 3000

CMD ["npm", "--prefix", "/workspace/dev", "run", "start"]
