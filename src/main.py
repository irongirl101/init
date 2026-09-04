import os
import yaml
import markdown
from markdown.extensions.toc import TocExtension
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import argparse
import shutil
import hashlib
import json
import re
from collections import defaultdict
from html import escape
from html.parser import HTMLParser
try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound

DEFAULT_PYGMENTS_THEME = "native"
TEMPLATE_DIR = "templates"
CONFIG_FILE = "config.yaml"
OUTPUT_DIR = "."
IMAGES_DIR = "assets/images"
CONTENT_DIR = "content"
POSTS_DIR = "content/posts"

PAGE_SLUG_CACHE = ".cache/page-slugs.json"
IMAGE_MANIFEST_PATH = ".cache/image-manifest.json"
GENERATED_THEME_PATH = "assets/css/generated.daisyui.css"
GENERATED_FONTS_PATH = "assets/css/generated.fonts.css"
GENERATED_SYNTAX_PATH = "assets/css/syntax.css"


def load_previous_slugs():
    try:
        with open(PAGE_SLUG_CACHE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


def save_current_slugs(slugs):
    os.makedirs(os.path.dirname(PAGE_SLUG_CACHE), exist_ok=True)
    try:
        with open(PAGE_SLUG_CACHE, "w", encoding="utf-8") as f:
            json.dump(sorted(slugs), f)
    except OSError as e:
        print(f"Warning: Could not save slug cache: {e}")


def clean_output(directory):
    print("Cleaning old build files...")
    preserved_roots = {
        ".git",
        ".github",
        ".cache",
        ".venv",
        "assets",
        "content",
        "dist",
        "docs",
        "node_modules",
        "src",
        "templates",
        "scripts",
        "data",
        "config.yaml",
        "package.json",
        "package-lock.json",
        "requirements.txt",
        "vite.config.mjs",
        "README.md",
        "LICENSE.md",
        "CONTRIBUTING.md",
        ".env",
        ".env.example",
        ".gitignore",
        ".dockerignore",
        "Dockerfile",
    }
    
    preserved_files = {
        "config.yaml",
        "package.json",
        "package-lock.json",
        "requirements.txt",
        "vite.config.mjs",
        "README.md",
        "LICENSE.md",
        "CONTRIBUTING.md",
        ".env",
        ".env.example",
        ".gitignore",
    }

    for name in os.listdir(directory):
        path = os.path.join(directory, name)
        
        if name in preserved_roots or name in preserved_files:
            continue
            
        if name.startswith(".") and name not in preserved_roots:
            continue

        try:
            if os.path.isfile(path) or os.path.islink(path):
                os.remove(path)
                print(f"Deleted file: {path}")
            elif os.path.isdir(path):
                shutil.rmtree(path)
                print(f"Deleted directory: {path}")
        except Exception as e:
            print(f"Failed to delete {path}: {e}")

    print("Cleanup complete.")


def has_file_changed(filepath, cache_dir=".cache"):
    os.makedirs(cache_dir, exist_ok=True)
    rel = os.path.relpath(filepath)
    file_hash = hashlib.md5(open(filepath, "rb").read()).hexdigest()
    safe_name = rel.replace(os.sep, "__") + ".hash"
    cache_file = os.path.join(cache_dir, safe_name)

    if os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8") as f:
            cached_hash = f.read().strip()
        if cached_hash == file_hash:
            return False

    with open(cache_file, "w", encoding="utf-8") as f:
        f.write(file_hash)
    return True


def safe_parse_date(date_value):

    if not date_value:
        return None

    if isinstance(date_value, datetime):
        return date_value

    if isinstance(date_value, str):
        formats = [
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y-%m",
            "%Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_value, fmt)
            except ValueError:
                continue
        
        try:
            return datetime.fromisoformat(date_value)
        except ValueError:
            pass

    print(f"Warning: Could not parse date: {date_value}")
    return None


def _ensure_sequence(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [item for item in value if item is not None]
    return [value]


def _format_css_scalar(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, str):
        if not value:
            return '""'
        if re.search(r"[\s;:\"]", value):
            return json.dumps(value)
        return value
    return json.dumps(value)


def normalize_theme_config(config):
    theme_config = config.get("theme")

    if isinstance(theme_config, str):
        base = {"default": theme_config}
    elif isinstance(theme_config, dict):
        base = dict(theme_config)
    else:
        base = {}

    default_theme = (
        base.get("default")
        or base.get("preset")
        or base.get("name")
        or "dracula"
    )

    include_candidates = base.get("include") or base.get("presets") or []
    include_list = _ensure_sequence(include_candidates)

    ordered = []
    seen = set()
    if default_theme:
        seen.add(default_theme)
        ordered.append(default_theme)

    for entry in include_list:
        if not entry:
            continue
        name = str(entry).strip()
        if not name or name in seen:
            continue
        ordered.append(name)
        seen.add(name)

    normalized = dict(base)
    normalized["default"] = default_theme
    normalized["include"] = ordered  

    config["theme"] = normalized
    return normalized


def write_theme_file(config, output_path=GENERATED_THEME_PATH):
    theme = config.get("theme") or {}
    print(f"DEBUG: write_theme_file theme config: {theme}")
    include = theme.get("include") or []
    include_list = _ensure_sequence(include)

    names = []
    seen = set()
    for entry in include_list:
        name = str(entry).strip()
        if not name or name in seen:
            continue
        names.append(name)
        seen.add(name)

    css_blocks = []
    if names:
        joined_names = ", ".join(names)
        css_blocks.append(f'@plugin "daisyui" {{\n  themes: {joined_names};\n}}')
    else:
        css_blocks.append('@plugin "daisyui" {\n  themes: all;\n}')

    custom = theme.get("custom")
    custom_items = custom.items() if isinstance(custom, dict) else []
    default_theme = theme.get("default")

    for name, values in custom_items:
        if not name or not values:
            continue

        lines = ['@plugin "daisyui/theme" {']
        
        # Determine strict defaults
        is_default = bool(default_theme and default_theme == name)
        
        if isinstance(values, str):
            # Raw css mode
            # We still need to provide name and default properties for daisyui plugin to work
             lines.append(f"  name: {_format_css_scalar(name)};")
             lines.append(f"  default: {_format_css_scalar(is_default)};")
             lines.append(values)
        elif isinstance(values, dict):
             seen_keys = set()
             
             theme_name = values.get("name") if isinstance(values.get("name"), str) else None
             theme_name = theme_name.strip() if theme_name else name
             lines.append(f"  name: {_format_css_scalar(theme_name)};")
             seen_keys.add("name")

             if "default" in values:
                 lines.append(f"  default: {_format_css_scalar(values['default'])};")
                 seen_keys.add("default")
             else:
                 lines.append(f"  default: {_format_css_scalar(is_default)};")
                 seen_keys.add("default")

             for key, value in values.items():
                 if key in seen_keys:
                     continue
                 lines.append(f"  {key}: {_format_css_scalar(value)};")
                 seen_keys.add(key)
        else:
            continue

        lines.append("}")
        css_blocks.append("\n".join(lines))

    css_content = "\n\n".join(css_blocks) + "\n"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(css_content)
    except OSError as e:
        print(f"Error: Failed to write theme file {output_path}: {e}")


def _normalize_font_family(value):
    if value is None:
        return None
    if isinstance(value, (list, tuple, set)):
        parts = [str(item).strip() for item in value if str(item).strip()]
        return ", ".join(parts) if parts else None
    text = str(value).strip()
    return text or None


def _css_safe_key(name):
    slug = re.sub(r"[^a-z0-9-]+", "-", str(name).strip().lower())
    slug = slug.strip("-")
    return slug or "custom"


def write_font_file(config, output_path=GENERATED_FONTS_PATH):
    fonts_config = config.get("fonts") or {}
    import_entries = [
        str(item).strip()
        for item in _ensure_sequence(fonts_config.get("imports") or fonts_config.get("import"))
        if str(item).strip()
    ]

    custom_entries = _ensure_sequence(
        fonts_config.get("custom") or fonts_config.get("inline")
    )

    families_config = fonts_config.get("families")
    if not isinstance(families_config, dict):
        families_config = {}

    default_body = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    default_heading = f"var(--font-body, {default_body})"
    default_mono = (
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    )

    variables = []
    seen_keys = set()
    standard_defaults = {
        "body": default_body,
        "heading": default_heading,
        "mono": default_mono,
    }

    for key, fallback in standard_defaults.items():
        custom_value = _normalize_font_family(families_config.get(key))
        variables.append((key, custom_value or fallback))
        seen_keys.add(key)

    for key, value in families_config.items():
        if key in seen_keys:
            continue
        custom_value = _normalize_font_family(value)
        if not custom_value:
            continue
        variables.append((key, custom_value))

    lines = []

    for item in import_entries:
        if item.startswith("@import"):
            lines.append(item if item.endswith(";") else f"{item};")
        else:
            lines.append(f'@import url("{item}");')

    if import_entries:
        lines.append("")

    for entry in custom_entries:
        if isinstance(entry, dict):
            block_lines = ["@font-face {"]
            for prop, value in entry.items():
                formatted = _format_css_scalar(value)
                if not formatted:
                    continue
                block_lines.append(f"  {prop}: {formatted};")
            block_lines.append("}")
            lines.append("\n".join(block_lines))
        elif entry:
            lines.append(str(entry))

    if custom_entries:
        lines.append("")

    if variables:
        lines.append(":root {")
        for key, value in variables:
            lines.append(f"  --font-{_css_safe_key(key)}: {value};")
        lines.append("}")
        lines.append("")

    lines.append("body {")
    lines.append(f"  font-family: var(--font-body, {default_body});")
    lines.append("}")
    lines.append("")

    lines.append("h1, h2, h3, h4, h5, h6 {")
    lines.append(
        f"  font-family: var(--font-heading, var(--font-body, {default_body}));"
    )
    lines.append("}")
    lines.append("")

    lines.append("code, pre, kbd, samp {")
    lines.append(
        f"  font-family: var(--font-mono, {default_mono});"
    )
    lines.append("}")
    lines.append("")

    css_output = "\n".join(lines).rstrip() + "\n"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(css_output)
    except OSError as e:
        print(f"Error: Failed to write font file {output_path}: {e}")


def resolve_pygments_theme(config):
    syntax_config = config.get("syntax") if isinstance(config, dict) else None
    theme_candidate = None
    if isinstance(syntax_config, dict):
        raw_value = syntax_config.get("pygments_theme") or syntax_config.get("theme")
        if raw_value is not None:
            theme_candidate = str(raw_value).strip()

    if not theme_candidate:
        env_value = os.getenv("PYGMENTIZE_THEME")
        if env_value:
            theme_candidate = env_value.strip()

    theme = theme_candidate or DEFAULT_PYGMENTS_THEME

    if not isinstance(syntax_config, dict):
        syntax_config = {}
        config["syntax"] = syntax_config

    if "pygments_theme" not in syntax_config or not str(syntax_config["pygments_theme"]).strip():
        syntax_config["pygments_theme"] = theme

    syntax_config["pygments_theme_resolved"] = theme
    return theme


def generate_syntax_css(theme, output_path=GENERATED_SYNTAX_PATH):
    try:
        formatter = HtmlFormatter(style=theme)
        active_theme = theme
    except ClassNotFound:
        fallback = DEFAULT_PYGMENTS_THEME
        print(
            f"Warning: Pygments theme '{theme}' not found. Falling back to '{fallback}'."
        )
        formatter = HtmlFormatter(style=fallback)
        active_theme = fallback

    css = formatter.get_style_defs(".highlight")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(css + "\n")
    except OSError as e:
        print(f"Error: Failed to write syntax CSS {output_path}: {e}")
    return active_theme


def generate_styles(
    config_path=CONFIG_FILE,
    theme_path=GENERATED_THEME_PATH,
    fonts_path=GENERATED_FONTS_PATH,
):
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f) or {}
    if os.environ.get("BASE_URL") is not None:
        config["base_url"] = os.environ.get("BASE_URL")
    normalize_theme_config(config)
    pygments_theme = resolve_pygments_theme(config)
    write_theme_file(config, theme_path)
    write_font_file(config, fonts_path)
    active_theme = generate_syntax_css(pygments_theme)
    config.setdefault("syntax", {})["pygments_theme_resolved"] = active_theme
    return config, active_theme


MARKDOWN_EXTENSIONS = [
    "fenced_code",
    "codehilite",
    "footnotes",
    "tables",
    "attr_list",
    "sane_lists",
    "md_in_html",
    TocExtension(permalink=True),
]

def build_markdown(pygments_theme, markdown_config=None):
    if markdown_config is None:
        markdown_config = {}

    extensions = []
    extension_configs = {
        "codehilite": {
            "guess_lang": False,
            "noclasses": False,
            "pygments_style": pygments_theme,
        }
    }

    config_extensions = markdown_config.get("extensions")
    
    # Fallback to default if not configured or empty
    if not config_extensions:
        # Replicate the previous default list
        # "fenced_code", "codehilite", "footnotes", "tables", "attr_list", "sane_lists", "md_in_html", toc
        extensions = [
            "fenced_code",
            "codehilite",
            "footnotes",
            "tables",
            "attr_list",
            "sane_lists",
            "md_in_html",
            "toc"
        ]
        extension_configs["toc"] = {"permalink": True}
    else:
        for ext in config_extensions:
            if isinstance(ext, str):
                extensions.append(ext)
            elif isinstance(ext, dict):
                for name, config in ext.items():
                    extensions.append(name)
                    if config:
                        # If the extension is codehilite, we need to merge with existing pygments config
                        if name == "codehilite":
                            current_conf = extension_configs.get("codehilite", {})
                            current_conf.update(config)
                            extension_configs["codehilite"] = current_conf
                        else:
                            extension_configs[name] = config

    
    return markdown.Markdown(
        extensions=extensions, extension_configs=extension_configs
    )


def load_templates(env, template_dir=TEMPLATE_DIR, allowed_extensions=(".html", ".jinja", ".jinja2", ".j2")):
    templates = {}
    for root, _, files in os.walk(template_dir):
        for filename in files:
            if allowed_extensions and not filename.endswith(allowed_extensions):
                continue
            rel_path = os.path.relpath(os.path.join(root, filename), template_dir)
            rel_path = rel_path.replace(os.sep, "/")
            template = env.get_template(rel_path)
            base_name = os.path.splitext(filename)[0]
            rel_without_ext = os.path.splitext(rel_path)[0]
            for key in (rel_path, rel_without_ext, base_name):
                if key not in templates:
                    templates[key] = template
    return templates


def parse_file(filepath, pygments_theme, markdown_config=None):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            file_content = f.read()
    except OSError as e:
        print(f"Error: Could not read file {filepath}: {e}")
        return None, None

    if file_content.startswith("---"):
        try:
            parts = file_content.split("---", 2)
            page_config = yaml.safe_load(parts[1]) or {}
            markdown_data = parts[2]
        except (IndexError, yaml.YAMLError) as e:
            print(f"Error parsing YAML frontmatter in {filepath}: {e}")
            page_config = {}
            markdown_data = file_content
    else:
        page_config = {}
        markdown_data = file_content

    md = build_markdown(pygments_theme, markdown_config)
    html_data = md.convert(markdown_data)
    md.reset()

    rel_path = os.path.relpath(filepath, CONTENT_DIR)
    
    if rel_path.startswith(".."):
         # Fallback to simple filename based slug for safety or treat as root
         slug = os.path.splitext(os.path.basename(filepath))[0]
         url_path = slug
    else:
         url_path = os.path.splitext(rel_path)[0]

    # Normalize Windows paths
    url_path = url_path.replace(os.sep, "/")

    if url_path == "index":
        page_config["url"] = "/"
    elif url_path.endswith("/index"):
        # e.g. sub/index -> /sub/
        page_config["url"] = "/" + url_path[:-5]
    else:
        page_config["url"] = "/" + url_path

    # Normalize date to YYYY-MM-DD string
    if "date" in page_config and page_config["date"]:
        parsed_date = safe_parse_date(page_config["date"])
        if parsed_date:
            page_config["date"] = parsed_date.strftime("%Y-%m-%d")
        else:
            pass

    return page_config, html_data


def tag_pages(tag_template, site_config, tags=None, image_manifest=None):
    tags = tags or {}
    tags_dir = os.path.join(OUTPUT_DIR, "tags")
    os.makedirs(tags_dir, exist_ok=True)

    for tag_name, posts_with_tag in tags.items():
        posts_with_tag.sort(
            key=lambda x: (
                safe_parse_date(x.get("date")) or datetime.min
            ),
            reverse=True
        )
        tag_page_html = tag_template.render(
            site=site_config,
            tag_name=tag_name,
            posts=posts_with_tag,
            page={"title": f"Tag: {tag_name}"},
        )
        tag_page_html = replace_images_with_processed(tag_page_html, image_manifest)
        output_path = os.path.join(tags_dir, f"{tag_name}.html")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(tag_page_html)
            print(f"Generated tag page: tags/{tag_name}.html")
        except OSError as e:
            print(f"Error: Failed to write tag page {output_path}: {e}")


def render_page(
    page_config,
    html_data,
    site_config,
    templates,
    image_manifest=None,
    **context_data,
):
    layout = page_config.get("layout") or "post"
    if layout not in templates:
        available = ", ".join(sorted(templates.keys())) or "none"
        print(
            f"Error: Template '{layout}' not found. Available templates: {available}. Skipping build."
        )
        return

    template = templates[layout]

    render_details = {"site": site_config, "page": page_config, "content": html_data}
    render_details.update(context_data)

    final_html = template.render(render_details)
    final_html = replace_images_with_processed(final_html, image_manifest)

    if page_config["url"] == "/":
        output_path = os.path.join(OUTPUT_DIR, "index.html")
    else:
        output_path = os.path.join(
            OUTPUT_DIR, page_config["url"].lstrip("/"), "index.html"
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(final_html)
        print(
            f"Generated: {page_config['url'] if page_config['url'] != '/' else '/index.html'}"
        )
    except OSError as e:
        print(f"Error: Failed to write page {output_path}: {e}")



def load_image_manifest(path=IMAGE_MANIFEST_PATH):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        print(f"Warning: Unable to parse image manifest {path}: {exc}")
        return {}


def _render_attributes(attrs):
    parts = []
    for name, value in attrs:
        if value is None:
            parts.append(f" {name}")
        else:
            parts.append(f' {name}="{escape(str(value), quote=True)}"')
    return "".join(parts)


def _build_picture_element(attrs, manifest_entry):
    if not manifest_entry:
        return None

    attrs_dict = {name.lower(): value for name, value in attrs}
    sizes_value = attrs_dict.get("data-img-sizes") or attrs_dict.get("sizes") or "100vw"

    format_priority = ["avif", "webp", "jpg", "jpeg", "png"]
    fallback_priority = ["jpg", "jpeg", "png", "webp", "avif"]
    mime_overrides = {"jpg": "image/jpeg", "jpeg": "image/jpeg"}

    sources = []
    for fmt in format_priority:
        variants = manifest_entry.get(fmt)
        if not variants:
            continue
        sorted_variants = sorted(
            (v for v in variants if v.get("path") and v.get("width")),
            key=lambda item: item["width"],
        )
        if not sorted_variants:
            continue
        srcset = ", ".join(
            f"{variant['path'] if variant['path'].startswith('http') else '/' + variant['path']} {variant['width']}w"
            for variant in sorted_variants
        )
        mime = mime_overrides.get(fmt, f"image/{fmt}")
        sources.append(
            f'<source type="{mime}" srcset="{srcset}" sizes="{sizes_value}">'
        )

    if not sources:
        return None

    fallback_format = next(
        (fmt for fmt in fallback_priority if manifest_entry.get(fmt)), None
    )
    if not fallback_format:
        return None

    fallback_variants = sorted(
        (
            v
            for v in manifest_entry[fallback_format]
            if v.get("path") and v.get("width")
        ),
        key=lambda item: item.get("width", 0),
    )
    if not fallback_variants:
        return None

    if fallback_variants[-1]['path'].startswith("http"):
        fallback_src = fallback_variants[-1]['path']
    else:
        fallback_src = f"/{fallback_variants[-1]['path']}"

    fallback_srcset = ", ".join(
        f"{variant['path'] if variant['path'].startswith('http') else '/' + variant['path']} {variant['width']}w" 
        for variant in fallback_variants
    )

    filtered_attrs = [
        (name, value)
        for (name, value) in attrs
        if name.lower() not in {"src", "srcset", "sizes", "data-img-sizes"}
    ]
    fallback_attrs = [("src", fallback_src)] + filtered_attrs
    if fallback_srcset:
        fallback_attrs.append(("srcset", fallback_srcset))
    fallback_attrs.append(("sizes", sizes_value))

    img_tag = "<img{}>".format(_render_attributes(fallback_attrs))
    sources_html = "".join(sources)
    return f"<picture>{sources_html}{img_tag}</picture>"


class ImageReplacementParser(HTMLParser):
    def __init__(self, manifest):
        super().__init__(convert_charrefs=False)
        self.manifest = manifest or {}
        self.output = []

    def handle_starttag(self, tag, attrs):
        self._handle_start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self._handle_start(tag, attrs)

    def handle_endtag(self, tag):
        self.output.append(f"</{tag}>")

    def handle_data(self, data):
        self.output.append(data)

    def handle_comment(self, data):
        self.output.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.output.append(f"<!{decl}>")

    def handle_entityref(self, name):
        self.output.append(f"&{name};")

    def handle_charref(self, name):
        self.output.append(f"&#{name};")

    def handle_pi(self, data):
        self.output.append(f"<?{data}>")

    def _handle_start(self, tag, attrs):
        if tag.lower() == "img":
            replacement = self._build_replacement(attrs)
            if replacement:
                self.output.append(replacement)
                return
        raw = self.get_starttag_text()
        if raw:
            self.output.append(raw)

    def _build_replacement(self, attrs):
        attrs_dict = {k.lower(): v for k, v in attrs}
        if "data-no-process" in attrs_dict or "data-raw" in attrs_dict:
            return None
        src = attrs_dict.get("src")
        if not src:
            return None

        normalized = src.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        if normalized.startswith("./"):
            normalized = normalized[2:]
        if "assets/images/" not in normalized:
            return None

        relative = normalized.split("assets/images/", 1)[1]
        manifest_entry = self.manifest.get(os.path.basename(relative))
        if not manifest_entry:
            return None

        return _build_picture_element(attrs, manifest_entry)

    def get_html(self):
        return "".join(self.output)


def replace_images_with_processed(html, manifest):
    if not html or not manifest:
        return html
    parser = ImageReplacementParser(manifest)
    parser.feed(html)
    parser.close()
    return parser.get_html()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--generate-styles", action="store_true")
    args = parser.parse_args()

    if args.clean:
        clean_output(OUTPUT_DIR)
        if os.path.exists(PAGE_SLUG_CACHE):
            os.remove(PAGE_SLUG_CACHE)
        print("generated files are deleted.")
        return

    if args.generate_styles:
        _, syntax_theme = generate_styles()
        print(
            f"Generated theme, font, and syntax CSS (Pygments theme: {syntax_theme})."
        )
        return

    site_config, pygments_theme = generate_styles()
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    templates = load_templates(env)
    image_manifest = load_image_manifest()

    if args.file:
        print(f"Change detected in {args.file}, proceeding to rebuild...")
        if not os.path.exists(args.file):

            slug = os.path.splitext(os.path.basename(args.file))[0]
            if slug != "index":
                out_dir = os.path.join(OUTPUT_DIR, slug)
                if os.path.isdir(out_dir):
                    shutil.rmtree(out_dir)
                    print(f"Removed deleted page output: {out_dir}")

            if os.path.exists(PAGE_SLUG_CACHE):
                os.remove(PAGE_SLUG_CACHE)
            return

        if not has_file_changed(args.file):
            print(
                f"No changes detected in {args.file} based on cache; rebuilding anyway."
            )

        page_data, html_content = parse_file(
            args.file, pygments_theme, site_config.get("markdown")
        )
        if page_data is None or html_content is None:
            return
        render_page(
            page_data,
            html_content,
            site_config,
            templates,
            image_manifest=image_manifest,
        )
    else:
        print("Running a full build...")
        sitemap_list = []
        all_posts = []
        pages = []
        tags = {}

        clean_output(OUTPUT_DIR)

        current_slugs = set()
        previous_slugs = load_previous_slugs()

        # Dynamic collections: layout -> list of pages
        collections = defaultdict(list)

        for root, _, files in os.walk(CONTENT_DIR):
            for filename in files:
                if not filename.endswith(".md"):
                    continue
                
                filepath = os.path.join(root, filename)
                page_data, html_content = parse_file(
                    filepath, pygments_theme, site_config.get("markdown")
                )
                if not page_data:
                    continue
                if str(page_data.get("draft")).lower() in ("true", "1", "yes"):
                    continue
                
                # Determine slug/key for caching mechanism
                # We use the relative path without extension as the key
                rel_path = os.path.relpath(filepath, CONTENT_DIR)
                slug_key = os.path.splitext(rel_path)[0].replace(os.sep, "/")
                current_slugs.add(slug_key)

                pages.append({"data": page_data, "content": html_content})
                sitemap_list.append(page_data["url"])
                
                layout = page_data.get("layout")
                if layout:
                    collections[layout].append(page_data)
                    
                    if layout == "post":
                        for tag in page_data.get("tags") or []:
                             tags.setdefault(tag, []).append(page_data)

        removed = previous_slugs - current_slugs
        for slug in removed:
             if slug == "index":
                 continue
             out_dir = os.path.join(OUTPUT_DIR, slug)
             if os.path.isdir(out_dir):
                 shutil.rmtree(out_dir, ignore_errors=True)
                 print(f"Removed stale page directory: {out_dir}")

        save_current_slugs(current_slugs)

        # Generic date sorting for all collections
        for layout_name, items in collections.items():
            if not items:
                continue
            
            # Check if any item has a date
            has_date = any(x.get("date") for x in items)
            has_order = any(x.get("order") is not None for x in items)
            
            if has_date:
                     items.sort(
                        key=lambda x: (
                            safe_parse_date(x.get("date")) or datetime.min
                        ),
                        reverse=True,
                    )
            elif has_order:
                 items.sort(key=lambda x: x.get("order", 999))
            else:
                 pass

        context_data = {}
        for k, v in collections.items():
            w = k.replace("-", "_") + "s"
            context_data[w] = v

        for page in pages:
            render_page(
                page["data"],
                page["content"],
                site_config,
                templates,
                image_manifest=image_manifest,
                **context_data
            )

        tag_template = templates.get("tags") or templates.get("tags.html")
        if tag_template:
            tag_pages(
                tag_template,
                site_config,
                tags,
                image_manifest=image_manifest,
            )
        else:
            print("Warning: tags template not found; skipping tag page generation.")

        sitemap_template = env.get_template("sitemap.xml.j2")
        sitemap_xml = sitemap_template.render(site=site_config, pages=sitemap_list)
        sitemap_xml = sitemap_template.render(site=site_config, pages=sitemap_list)
        try:
            with open(os.path.join(OUTPUT_DIR, "sitemap.xml"), "w") as f:
                f.write(sitemap_xml)
            print("Generated sitemap.xml")
        except OSError as e:
            print(f"Error: Failed to write sitemap.xml: {e}")


if __name__ == "__main__":
    main()
