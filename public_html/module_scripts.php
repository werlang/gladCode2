<?php
/**
 * Frontend ES module loading.
 *
 * The server sends no cache headers for scripts, so every module is versioned by
 * its modification time through an import map: a browser never mixes a cached
 * module with a newer one. A page prints the map once (an import map must come
 * before the first module script) and loads its entry through moduleSrc().
 */

/** Folders under script/ whose modules are versioned (render2 has its own map in playback.php). */
const MODULE_DIRS = ["", "components", "helpers", "models", "profile", "templates"];

/**
 * Import map entries for every frontend module.
 *
 * @param array $extra Extra entries merged in (e.g. the 3D renderer's).
 * @return array Specifier => versioned URL.
 */
function moduleImports(array $extra = []): array {
    $imports = [];
    foreach (MODULE_DIRS as $dir) {
        $path = rtrim(__DIR__ . "/script/$dir", "/");
        foreach (glob("$path/*.js") as $file) {
            $url = "/script/" . ($dir === "" ? "" : "$dir/") . basename($file);
            $imports[$url] = "$url?v=" . filemtime($file);
        }
    }
    return array_merge($imports, $extra);
}

/**
 * Prints the import map script tag.
 *
 * @param array $extra Extra entries merged in.
 */
function printModuleImportMap(array $extra = []): void {
    echo "<script type=\"importmap\">" . json_encode(["imports" => moduleImports($extra)], JSON_UNESCAPED_SLASHES) . "</script>\n";
}

/**
 * Versioned URL of a module entry under script/.
 *
 * @param string $file Path relative to script/, e.g. "header.js".
 * @return string
 */
function moduleSrc(string $file): string {
    return "/script/$file?v=" . filemtime(__DIR__ . "/script/$file");
}
