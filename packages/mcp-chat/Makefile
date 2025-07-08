# package.json에서 버전 읽기
VERSION := $(shell node -p "require('./package.json').version")

login:
	aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/z7w0k2i4

push:
	docker buildx build --platform linux/amd64,linux/arm64 \
		-t public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:v$(VERSION) \
		-t public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest \
		. --push

all: login push
