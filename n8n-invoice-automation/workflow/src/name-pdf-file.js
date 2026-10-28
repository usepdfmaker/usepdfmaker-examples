// Step 4 of the example: name the PDF after the validated invoice number.
// The invoice number comes from the Build Invoice HTML node, not from the UsePDFMaker output.
// That keeps a retry of this node or of UsePDFMaker tied to the same invoice number.
// nameInvoicePdf stores the PDF again under the new name, because n8n's download uses the name stored with the file.

const invoiceNumber = $('Build Invoice HTML').first().json.invoiceNumber;

return [await nameInvoicePdf($input.first(), invoiceNumber, helpers)];
