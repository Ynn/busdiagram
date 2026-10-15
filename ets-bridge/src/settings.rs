//! Settings of the program, kept between sessions in a small text file
//! (`%APPDATA%\BusDiagram-ETS\reglages.txt` on Windows).

use std::path::PathBuf;

/// Port of the WebSocket the diagrams connect to (option `bridge` of BusDiagram).
pub const WS_PORT: u16 = 3761;
/// Tunnelling port: 3672, so as not to compete with KNX Virtual on 3671.
pub const TUNNEL_PORT: u16 = 3672;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Settings {
    /// Port ETS connects to (KNXnet/IP tunnelling, UDP).
    pub tunnel_port: u16,
    /// Port the diagrams connect to (WebSocket, on this computer only).
    pub ws_port: u16,
    /// ETS may connect from another computer of the network, not only from this one.
    pub remote_ets: bool,
    /// Sites allowed to link a diagram, besides files, local pages and the published site.
    pub origins: Vec<String>,
    /// Write every telegram in the journal.
    pub verbose: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            tunnel_port: TUNNEL_PORT,
            ws_port: WS_PORT,
            remote_ets: false,
            origins: Vec::new(),
            verbose: false,
        }
    }
}

/// An allowed site, as browsers send it: "https://site.example[:port]", lower case.
pub fn normalize_origin(text: &str) -> Option<String> {
    let o = text.trim().trim_end_matches('/').to_ascii_lowercase();
    let host = o
        .strip_prefix("https://")
        .or_else(|| o.strip_prefix("http://"))?;
    (!host.is_empty() && !host.contains(['/', ' ', '*'])).then_some(o)
}

impl Settings {
    pub fn to_text(&self) -> String {
        let mut out = format!(
            "# Réglages de BusDiagram-ETS\ntunnel_port={}\nws_port={}\nremote_ets={}\nverbose={}\n",
            self.tunnel_port, self.ws_port, self.remote_ets, self.verbose
        );
        for o in &self.origins {
            out.push_str(&format!("origin={o}\n"));
        }
        out
    }

    /// Settings of a file; unknown or invalid lines keep the default value.
    pub fn from_text(text: &str) -> Self {
        let mut s = Self::default();
        for line in text.lines() {
            let Some((k, v)) = line.split_once('=') else {
                continue;
            };
            let v = v.trim();
            match k.trim() {
                "tunnel_port" => s.tunnel_port = v.parse().unwrap_or(s.tunnel_port),
                "ws_port" => s.ws_port = v.parse().unwrap_or(s.ws_port),
                "remote_ets" => s.remote_ets = v == "true",
                "verbose" => s.verbose = v == "true",
                "origin" => s.origins.extend(normalize_origin(v)),
                _ => {}
            }
        }
        s
    }

    fn path() -> Option<PathBuf> {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            return Some(
                PathBuf::from(appdata)
                    .join("BusDiagram-ETS")
                    .join("reglages.txt"),
            );
        }
        let config = std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))?;
        Some(config.join("busdiagram-ets").join("settings.txt"))
    }

    pub fn load() -> Self {
        Self::path()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .map(|t| Self::from_text(&t))
            .unwrap_or_default()
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::path().ok_or("dossier des réglages introuvable")?;
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        std::fs::write(path, self.to_text()).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let s = Settings {
            tunnel_port: 3680,
            ws_port: 3800,
            remote_ets: true,
            origins: vec!["https://cours.example".into()],
            verbose: true,
        };
        assert_eq!(Settings::from_text(&s.to_text()), s);
        assert_eq!(
            Settings::from_text("tunnel_port=abc\nnope"),
            Settings::default()
        );
    }

    #[test]
    fn origins() {
        assert_eq!(
            normalize_origin(" https://Cours.example/ "),
            Some("https://cours.example".into())
        );
        assert_eq!(normalize_origin("cours.example"), None);
        assert_eq!(normalize_origin("https://*.example"), None);
        assert_eq!(normalize_origin("https://a.example/page"), None);
    }
}
