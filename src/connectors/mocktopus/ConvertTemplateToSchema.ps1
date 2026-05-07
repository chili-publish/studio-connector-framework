<#
.SYNOPSIS
    Parses a GraFx template JSON and converts its variables section
    into a schema string compatible with the Mocktopus data connector.

.DESCRIPTION
    Reads the `variables` array from a GraFx template JSON file,
    maps each variable's name and type to the Mocktopus DSL format:

        fieldName:type, fieldName:type(param=value), ...

    Valid DSL schema types (shortText, longText, number, boolean, date, list, image)
    are passed through as-is. Any type not recognised by the connector is flagged
    with a warning and skipped, keeping the output safe to paste directly into
    the connector's "Schema" configuration field.

.PARAMETER TemplatePath
    Path to the GraFx template JSON file.

.PARAMETER OutputPath
    Optional. If supplied, the resulting schema string is also written to this file.

.PARAMETER IncludeReadonly
    Switch. When set, variables marked isReadonly:true are included.
    By default they are skipped (they cannot be driven by external data).

.PARAMETER ExcludeInvisible
    Switch. When set, variables whose visibility.type is not "visible" are skipped.
    By default all variables are included regardless of visibility.

.EXAMPLE
    .\ConvertTemplateToSchema.ps1 -TemplatePath .\template.json

.EXAMPLE
    .\ConvertTemplateToSchema.ps1 -TemplatePath .\template.json -OutputPath .\schema.txt -IncludeReadonly
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, HelpMessage = "Path to the GraFx template JSON file")]
    [string] $TemplatePath,

    [Parameter(Mandatory = $false, HelpMessage = "Optional file path to write the schema string to")]
    [string] $OutputPath,

    [switch] $IncludeReadonly,
    [switch] $ExcludeInvisible
)

# ---------------------------------------------------------------------------
# Type mapping: GraFx template type  →  Mocktopus connector DSL type
# Extend this table if your template uses additional type names.
# ---------------------------------------------------------------------------
$TypeMap = @{
    "shortText"  = "shortText"
    "longText"   = "longText"
    "number"     = "number"
    "boolean"    = "boolean"
    "date"       = "date"
    "list"       = "list"
    "image"      = "image"
}

# ---------------------------------------------------------------------------
# Load and validate the template JSON
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $TemplatePath)) {
    Write-Error "Template file not found: $TemplatePath"
    exit 1
}

Write-Verbose "Reading template: $TemplatePath"
$templateContent = Get-Content -LiteralPath $TemplatePath -Raw -Encoding UTF8

try {
    $template = $templateContent | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse JSON: $_"
    exit 1
}

if (-not $template.PSObject.Properties['variables']) {
    Write-Error "No 'variables' section found in the template JSON."
    exit 1
}

$variables = $template.variables
if ($variables.Count -eq 0) {
    Write-Warning "The 'variables' array is empty — no schema fields to generate."
    exit 0
}

Write-Verbose "Found $($variables.Count) variable(s) in template."

# ---------------------------------------------------------------------------
# Build schema fields
# ---------------------------------------------------------------------------
$schemaFields   = [System.Collections.Generic.List[string]]::new()
$skippedCount   = 0

foreach ($variable in $variables) {
    $varName = $variable.name
    $varType = $variable.type

    # --- Optional filters ---
    if (-not $IncludeReadonly -and $variable.isReadonly -eq $true) {
        Write-Verbose "Skipping readonly variable: '$varName'"
        $skippedCount++
        continue
    }

    if ($ExcludeInvisible) {
        $visType = $variable.visibility?.type
        if ($visType -and $visType -ne "visible") {
            Write-Verbose "Skipping non-visible variable: '$varName' (visibility: $visType)"
            $skippedCount++
            continue
        }
    }

    # --- Type resolution ---
    if (-not $TypeMap.ContainsKey($varType)) {
        Write-Warning "Unknown type '$varType' for variable '$varName' — skipping. Add it to `$TypeMap if needed."
        $skippedCount++
        continue
    }
    $connectorType = $TypeMap[$varType]

    # --- Name validation ---
    # The DSL splits fields on ',' (outside parens) and name from type on ':'.
    # Either character in a variable name would break the parser.
    if ($varName -match '[,:]') {
        Write-Error "Variable name '$varName' contains a reserved character (':' or ',') and cannot be used in the schema. Rename the variable in the template and try again."
        $skippedCount++
        continue
    }

    $schemaFields.Add("${varName}:${connectorType}")
}

# ---------------------------------------------------------------------------
# Assemble the DSL schema string
# ---------------------------------------------------------------------------
$schemaString = $schemaFields -join ", "

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Mocktopus Connector Schema ===" -ForegroundColor Cyan
Write-Host $schemaString
Write-Host ""
Write-Host "Fields included : $($schemaFields.Count)" -ForegroundColor Green
if ($skippedCount -gt 0) {
    Write-Host "Fields skipped  : $skippedCount  (use -IncludeReadonly to include readonly variables)" -ForegroundColor Yellow
}

if ($OutputPath) {
    $schemaString | Out-File -FilePath $OutputPath -Encoding UTF8 -NoNewline
    Write-Host "Schema written to: $OutputPath" -ForegroundColor Green
}