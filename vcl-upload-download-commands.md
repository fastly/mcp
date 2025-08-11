# Fastly VCL Upload and Download Commands

This document lists all Fastly CLI commands that can upload or download VCL content.

**Note:** As of the latest update, the following VCL commands are disabled by default in the MCP server for security reasons. The "list" and "delete" commands remain available.

## VCL Custom Commands

Commands for managing custom VCL files for a service version:

### Upload/Create Commands (DISABLED BY DEFAULT)
- **`fastly vcl custom create`** - Upload a VCL for a particular service and version ⛔
- **`fastly vcl custom update`** - Update the uploaded VCL for a particular service and version ⛔

### Download/Retrieve Commands  
- **`fastly vcl custom describe`** - Get the uploaded VCL for a particular service and version ⛔ (DISABLED BY DEFAULT)
- **`fastly vcl custom list`** - List the uploaded VCLs for a particular service and version ✅ (Available)

## VCL Snippet Commands

Commands for managing VCL snippets (blocks of VCL logic inserted into your service's configuration):

### Upload/Create Commands (DISABLED BY DEFAULT)
- **`fastly vcl snippet create`** - Create a snippet for a particular service and version ⛔
- **`fastly vcl snippet update`** - Update a VCL snippet for a particular service and version ⛔

### Download/Retrieve Commands
- **`fastly vcl snippet describe`** - Get the uploaded VCL snippet for a particular service and version ⛔ (DISABLED BY DEFAULT)
- **`fastly vcl snippet list`** - List the uploaded VCL snippets for a particular service and version ✅ (Available)

## Summary

### Commands that UPLOAD VCL content (⛔ DISABLED BY DEFAULT):
1. `fastly vcl custom create` ⛔
2. `fastly vcl custom update` ⛔
3. `fastly vcl snippet create` ⛔
4. `fastly vcl snippet update` ⛔

### Commands that DOWNLOAD VCL content:
1. `fastly vcl custom describe` ⛔ (DISABLED BY DEFAULT)
2. `fastly vcl custom list` ✅ (Available)
3. `fastly vcl snippet describe` ⛔ (DISABLED BY DEFAULT)
4. `fastly vcl snippet list` ✅ (Available)

## Notes
- All these commands require authentication via Fastly API token
- Commands typically require service ID and version number as parameters
- VCL Custom commands work with complete VCL files
- VCL Snippet commands work with smaller blocks of VCL logic that don't require custom VCL
- VCL Condition commands (`fastly vcl condition`) manage conditions but don't directly upload/download VCL code content
