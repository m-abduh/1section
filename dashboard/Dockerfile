FROM node:24-alpine

ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /dashboard

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
