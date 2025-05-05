FROM golang:1.17 as builder

WORKDIR /workspace

# Copy the Go source code
COPY pizza-controller.go /workspace/

# Download dependencies
RUN go mod init pizza-controller && \
    go get sigs.k8s.io/controller-runtime@v0.11.0 && \
    go get k8s.io/client-go@v0.23.0 && \
    go get sigs.k8s.io/controller-runtime/pkg/log/zap@v0.11.0 && \
    go get github.com/go-logr/zapr@v1.2.0 && \
    go get go.uber.org/zap@v1.19.1 && \
    go get go.uber.org/multierr@v1.6.0 && \
    go get go.uber.org/atomic@v1.7.0 && \
    go mod tidy

# Build the controller
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -o pizza-controller .

# Use distroless as minimal base image
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/pizza-controller /pizza-controller
USER 65532:65532

ENTRYPOINT ["/pizza-controller"]