from pathlib import Path

from docx import Document


DOC_PATH = Path(r"C:\Users\arjun\Downloads\MajorProject\Project Report- Development  (1).docx")

PROJECT_TITLE = "AI-assisted Resume Screener and Skill Gap Analyzer"
STUDENTS = [
    ("Arjun Santhosh", "AM.SC.U3BCA23017"),
    ("Sachin Soman", "AM.SC.U3BCA23038"),
    ("Vidin P P", "AM.SC.U3BCA23048"),
]
GUIDE_NAME = "Geethalakshmi V"


def set_run_text(run, value):
    run.text = value


def set_single_run(paragraph, value):
    for index, run in enumerate(paragraph.runs):
        run.text = value if index == 0 else ""


def main():
    doc = Document(DOC_PATH)
    paragraphs = doc.paragraphs

    student_names = ", ".join(name for name, _ in STUDENTS[:-1]) + f", and {STUDENTS[-1][0]}"
    student_names_plain = ", ".join(name for name, _ in STUDENTS[:-1]) + f" and {STUDENTS[-1][0]}"
    roll_numbers = ", ".join(roll for _, roll in STUDENTS[:-1]) + f", and {STUDENTS[-1][1]}"
    roll_numbers_plain = ", ".join(roll for _, roll in STUDENTS[:-1]) + f" and {STUDENTS[-1][1]}"

    set_single_run(paragraphs[1], PROJECT_TITLE)

    cert_para = paragraphs[23]
    set_run_text(
        cert_para.runs[1],
        f"{student_names} (bearing Roll Numbers {roll_numbers}, respectively",
    )

    set_single_run(paragraphs[24], f'"{PROJECT_TITLE}"')

    guide_para = paragraphs[28]
    set_run_text(guide_para.runs[0], "Ms. ")
    set_run_text(guide_para.runs[1], "Geethalakshmi ")
    set_run_text(guide_para.runs[2], "V")

    declaration_para = paragraphs[49]
    set_run_text(declaration_para.runs[1], f"{student_names_plain}, ({roll_numbers_plain}) ")
    set_run_text(declaration_para.runs[3], f"{PROJECT_TITLE} ")
    set_run_text(declaration_para.runs[5], GUIDE_NAME)

    set_run_text(paragraphs[52].runs[2], GUIDE_NAME)
    set_single_run(paragraphs[77], student_names_plain)

    # Keep the existing formal display style on the cover page.
    set_single_run(paragraphs[16], "May 2026")

    doc.save(DOC_PATH)


if __name__ == "__main__":
    main()
