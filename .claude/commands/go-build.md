# /go-build
Usage: /go-build [target]
Go-specific build resolving module issues and cross-compilation.
## Steps
1. Run go build with target
2. If errors, diagnose module/CGO issues
3. Fix go.mod/go.sum as needed
4. Retry build
5. Report success or remaining issues
