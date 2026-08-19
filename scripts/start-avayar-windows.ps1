$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ForwardArgs =
    @($args)

& {
    $OriginalHttpProxy =
        $env:HTTP_PROXY

    $OriginalHttpsProxy =
        $env:HTTPS_PROXY

    $OriginalNoProxy =
        $env:NO_PROXY

    $OriginalNodeUseEnvProxy =
        $env:NODE_USE_ENV_PROXY

    try {
        $Node =
            (Get-Command node).Source

        $NodeVersion =
            (& $Node --version).Trim()

        $Help =
            (
                & $Node --help
            ) -join "`n"

        $GeminiUri =
            [Uri](
                "https://generativelanguage.googleapis.com/"
            )

        $Proxy =
            [System.Net.Http.HttpClient]::DefaultProxy

        $NodeArgs = @()

        if (
            -not $Proxy.IsBypassed(
                $GeminiUri
            )
        ) {
            $Resolved =
                $Proxy.GetProxy(
                    $GeminiUri
                )

            if (
                $Resolved -and
                $Resolved.Host -ne
                    $GeminiUri.Host
            ) {
                if (
                    $Help -notmatch
                        "--use-env-proxy"
                ) {
                    throw (
                        "AvaYar requires a Node runtime with --use-env-proxy " +
                        "when Windows routes Gemini through a user proxy. " +
                        "Detected: $NodeVersion"
                    )
                }

                $env:HTTP_PROXY =
                    $Resolved.AbsoluteUri

                $env:HTTPS_PROXY =
                    $Resolved.AbsoluteUri

                $env:NO_PROXY =
                    "localhost,127.0.0.1"

                $env:NODE_USE_ENV_PROXY =
                    "1"

                $NodeArgs +=
                    "--use-env-proxy"
            }
        }

        $NodeArgs +=
            (
                Join-Path `
                    $PSScriptRoot `
                    "dev-server.mjs"
            )

        $NodeArgs +=
            $ForwardArgs

        & $Node @NodeArgs

        if ($LASTEXITCODE -ne 0) {
            throw (
                "AvaYar server exited with code " +
                $LASTEXITCODE
            )
        }
    }
    finally {
        if ($null -eq $OriginalHttpProxy) {
            Remove-Item `
                Env:HTTP_PROXY `
                -ErrorAction SilentlyContinue
        }
        else {
            $env:HTTP_PROXY =
                $OriginalHttpProxy
        }

        if ($null -eq $OriginalHttpsProxy) {
            Remove-Item `
                Env:HTTPS_PROXY `
                -ErrorAction SilentlyContinue
        }
        else {
            $env:HTTPS_PROXY =
                $OriginalHttpsProxy
        }

        if ($null -eq $OriginalNoProxy) {
            Remove-Item `
                Env:NO_PROXY `
                -ErrorAction SilentlyContinue
        }
        else {
            $env:NO_PROXY =
                $OriginalNoProxy
        }

        if ($null -eq $OriginalNodeUseEnvProxy) {
            Remove-Item `
                Env:NODE_USE_ENV_PROXY `
                -ErrorAction SilentlyContinue
        }
        else {
            $env:NODE_USE_ENV_PROXY =
                $OriginalNodeUseEnvProxy
        }
    }
}
