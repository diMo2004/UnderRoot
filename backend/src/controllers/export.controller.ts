import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";

export const exportProject = async (req: Request, res: Response) => {
  const { title, content, format, style } = req.body;

  if (format === "pdf") {
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${title}.pdf"`);
    
    doc.pipe(res);
    doc.fontSize(25).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(content);
    doc.end();
  } 
  else if (format === "docx") {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 48,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun(content)],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${title}.docx"`);
    res.send(buffer);
  }
  else {
    res.status(400).json({ error: "Unsupported format" });
  }
};
