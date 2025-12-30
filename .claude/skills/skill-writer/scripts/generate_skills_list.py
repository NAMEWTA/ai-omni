import yaml
import re
from pathlib import Path


def _xml_escape(text):
    if text is None:
        return ""
    value = str(text)
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def extract_yaml_frontmatter(content):
    match = re.search(r"\A---\s*\r?\n(.*?)\r?\n---\s*\r?\n", content, re.DOTALL)
    if not match:
        return {}
    try:
        data = yaml.safe_load(match.group(1))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def scan_subskills(system_root_dir):
    root_path = Path(system_root_dir)
    modules_dir = root_path / "modules"
    if not modules_dir.exists():
        return []

    catalog = []
    for skill_file in modules_dir.rglob("SKILL.md"):
        try:
            with open(skill_file, "r", encoding="utf-8-sig") as f:
                content = f.read()
            metadata = extract_yaml_frontmatter(content)
            if "name" not in metadata:
                continue

            relative_dir = skill_file.parent.relative_to(root_path)
            catalog.append(
                {
                    "name": metadata["name"],
                    "description": metadata.get("description", "无描述"),
                    "relativePath": relative_dir.as_posix(),
                }
            )
        except Exception as e:
            print(f"读取文件错误 {skill_file}: {e}")
    return catalog


def generate_skills_list_xml(catalog, output_file):
    header = "<!-- AUTO-GENERATED: Do not edit by hand. -->\n"
    header += "<!-- Run: python scripts/generate_skills_list.py -->\n\n"

    blocks = []
    for item in sorted(catalog, key=lambda x: (x.get("name") or "").lower()):
        name = _xml_escape(item.get("name", ""))
        description = _xml_escape(item.get("description", "无描述"))
        relative_path = _xml_escape(item.get("relativePath", ""))
        location = "project"

        blocks.append(
            "\n".join(
                [
                    "<skill>",
                    f"<name>{name}</name>",
                    f"<description>{description}</description>",
                    f"<location>{location}</location>",
                    f"<relativePath>{relative_path}</relativePath>",
                    "</skill>",
                ]
            )
        )

    content = header + "\n\n".join(blocks) + "\n"
    with open(output_file, "w", encoding="utf-8-sig", newline="\n") as f:
        f.write(content)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="为指定系统级 Skill 生成 skills-list.md"
    )
    parser.add_argument(
        "--target",
        type=str,
        default=None,
        help="目标系统级 Skill 的根目录（绝对或相对路径）。如果不传则默认为脚本自身所在 Skill 目录。",
    )
    args = parser.parse_args()

    if args.target:
        target_root = Path(args.target).resolve()
    else:
        target_root = Path(__file__).parent.parent

    catalog = scan_subskills(target_root)
    generate_skills_list_xml(catalog, target_root / "skills-list.md")
    print(f"已生成: {target_root / 'skills-list.md'}")
