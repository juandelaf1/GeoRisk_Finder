FROM node:20-alpine AS frontend
WORKDIR /app
COPY georisk-frontend/package.json georisk-frontend/package-lock.json ./
RUN npm ci
COPY georisk-frontend/ .
RUN npm run build

FROM python:3.12-slim AS backend
WORKDIR /app
COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt
COPY main.py .
COPY src/ ./src/
COPY --from=frontend /app/dist ./georisk-frontend/dist
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]