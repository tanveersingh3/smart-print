import fitz

def convert_to_bw(input_pdf, output_pdf):

    doc = fitz.open(input_pdf)

    new_doc = fitz.open()

    for page_num in range(len(doc)):

        page = doc.load_page(page_num)

        pix = page.get_pixmap(
            matrix=fitz.Matrix(2, 2),
            colorspace=fitz.csGRAY
        )

        img_pdf = fitz.open()

        rect = fitz.Rect(
            0,
            0,
            pix.width,
            pix.height
        )

        page_new = img_pdf.new_page(
            width=pix.width,
            height=pix.height
        )

        page_new.insert_image(
            rect,
            pixmap=pix
        )

        pdf_bytes = img_pdf.tobytes()

        temp_pdf = fitz.open(
            "pdf",
            pdf_bytes
        )

        new_doc.insert_pdf(temp_pdf)

    new_doc.save(output_pdf)

    doc.close()
    new_doc.close()