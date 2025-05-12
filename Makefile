VERSION_FILE := .version
VERSION := $(shell if [ -f $(VERSION_FILE) ]; then cat $(VERSION_FILE); else echo "v0.0.8"; fi)
NEXT_VERSION = $(shell echo $(VERSION) | awk -F. '{ print $$1"."$$2"."$$3+1 }')
API_ECR_REPO = 151166316313.dkr.ecr.us-east-1.amazonaws.com/pace-mcp-host-api
UI_ECR_REPO = 151166316313.dkr.ecr.us-east-1.amazonaws.com/pace-mcp-host-ui

# 초기 버전 파일 생성 (없는 경우)
$(shell if [ ! -f $(VERSION_FILE) ]; then echo "v0.0.1" > $(VERSION_FILE); fi)

all: next-version login push-api push-ui
api: next-version push-api
ui: next-version push-ui

login:
	export AWS_PROFILE=detective
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 151166316313.dkr.ecr.us-east-1.amazonaws.com

push-api:
	export AWS_PROFILE=detective
	docker buildx build --platform linux/amd64,linux/arm64 -t $(API_ECR_REPO):$(VERSION) packages/backend/ --push

push-ui:
	export AWS_PROFILE=detective
	cd packages/frontend && npm run build
	cd ../..
	docker buildx build --platform linux/amd64,linux/arm64 -t $(UI_ECR_REPO):$(VERSION) packages/frontend/ --push

# 다음 버전으로 빌드하기
next-version:
	@echo "Current version: $(VERSION)"
	@echo "Next version will be: $(NEXT_VERSION)"
	@echo $(NEXT_VERSION) > $(VERSION_FILE)

# 특정 버전으로 설정
set-version:
	@if [ -z "$(NEW_VERSION)" ]; then \
		echo "Error: NEW_VERSION is not set. Use 'make set-version NEW_VERSION=vX.Y.Z'"; \
		exit 1; \
	fi
	@echo "Setting version to: $(NEW_VERSION)"
	@echo $(NEW_VERSION) > $(VERSION_FILE)
	@echo "Version set to: $(NEW_VERSION)"

# 현재 버전 표시
show-version:
	@echo "Current version: $(VERSION)"