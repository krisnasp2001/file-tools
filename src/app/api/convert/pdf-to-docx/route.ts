import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

function getPythonPath(): string {
  const rootDir = process.cwd();
  // Check virtual environment first
  const winVenv = path.join(rootDir, ".venv", "Scripts", "python.exe");
  const unixVenv = path.join(rootDir, ".venv", "bin", "python");

  if (process.platform === "win32") {
    return winVenv;
  }
  return unixVenv;
}

export async function POST(req: NextRequest) {
  let tempInputPath = "";
  let tempOutputPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uniqueId = crypto.randomUUID();
    const tempDir = os.tmpdir();
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.docx`);

    // Write uploaded PDF to disk
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempInputPath, Buffer.from(arrayBuffer));

    // Resolve python & script path
    const pythonExecutable = getPythonPath();
    const scriptPath = path.join(process.cwd(), "scripts", "convert_pdf_to_docx.py");

    // Execute conversion script
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(pythonExecutable, [scriptPath, tempInputPath, tempOutputPath], {
        cwd: process.cwd(),
      });

      let stderr = "";
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Conversion failed with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", (err) => {
        reject(err);
      });
    });

    // Read the converted DOCX file
    const docxBuffer = await fs.readFile(tempOutputPath);

    // Clean up temporary files
    await Promise.allSettled([
      fs.unlink(tempInputPath),
      fs.unlink(tempOutputPath),
    ]);

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          file.name.replace(/\.[^/.]+$/, "") + ".docx"
        )}"`,
      },
    });
  } catch (err: unknown) {
    // Attempt cleanup on failure
    if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
    if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});

    const msg = err instanceof Error ? err.message : "Internal conversion error";
    console.error("[API Convert PDF-to-DOCX Error]:", msg);

    return NextResponse.json(
      {
        error: msg,
        details: "High-fidelity engine unavailable. Fallback to client-side conversion.",
      },
      { status: 500 }
    );
  }
}
