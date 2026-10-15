//! The window of BusDiagram-ETS: what is connected, what to do in ETS and in the diagram,
//! the settings, and the journal.

use std::time::Duration;

use eframe::egui::{self, Color32, RichText};

use crate::bridge::{self, Bridge, Shared};
use crate::settings::{Settings, normalize_origin};
use crate::ws::PUBLISHED;

const GREEN: Color32 = Color32::from_rgb(0x1e, 0x9a, 0x6d);
const AMBER: Color32 = Color32::from_rgb(0xc8, 0x8a, 0x0c);
const RED: Color32 = Color32::from_rgb(0xb3, 0x45, 0x2f);
const MUTE: Color32 = Color32::from_rgb(0x6b, 0x70, 0x78);

pub struct App {
    shared: Shared,
    bridge: Option<Bridge>,
    /// Settings in use, and those being edited.
    applied: Settings,
    edit: Settings,
    origins_text: String,
    /// Settings were saved, or why not.
    note: Option<(String, bool)>,
}

impl App {
    pub fn new(settings: Settings, shared: Shared) -> Self {
        let mut app = Self {
            shared,
            bridge: None,
            origins_text: settings.origins.join("\n"),
            edit: settings.clone(),
            applied: settings,
            note: None,
        };
        app.restart();
        app
    }

    fn restart(&mut self) {
        if let Some(b) = self.bridge.take() {
            b.stop();
        }
        match Bridge::start(&self.applied, self.shared.clone()) {
            Ok(b) => self.bridge = Some(b),
            Err(e) => {
                self.shared.log(&e);
                self.shared.update(|s| {
                    s.running = false;
                    s.error = Some(e);
                });
            }
        }
    }

    fn apply(&mut self) {
        let mut invalid = Vec::new();
        self.edit.origins = self
            .origins_text
            .lines()
            .filter(|l| !l.trim().is_empty())
            .filter_map(|l| {
                let o = normalize_origin(l);
                if o.is_none() {
                    invalid.push(l.trim().to_owned());
                }
                o
            })
            .collect();
        if !invalid.is_empty() {
            self.note = Some((
                format!(
                    "Site non valide : {} (attendu : https://site.exemple)",
                    invalid.join(", ")
                ),
                false,
            ));
            return;
        }
        if self.edit.tunnel_port == self.edit.ws_port {
            self.note = Some(("Les deux ports doivent être différents.".into(), false));
            return;
        }
        self.applied = self.edit.clone();
        self.note = Some(match self.applied.save() {
            Ok(()) => ("Réglages appliqués et enregistrés.".into(), true),
            Err(e) => (format!("Réglages appliqués, non enregistrés : {e}"), false),
        });
        self.restart();
    }

    fn header(&self, ui: &mut egui::Ui, st: &bridge::Status) {
        // The embedded fonts have no arrow or bullet glyphs: plain text, painted dots.
        ui.horizontal(|ui| {
            ui.heading("BusDiagram – ETS");
            ui.label(RichText::new(concat!("version ", env!("CARGO_PKG_VERSION"))).color(MUTE));
        });
        ui.add_space(4.0);
        let dot = |ui: &mut egui::Ui, color: Color32, text: String| {
            ui.horizontal(|ui| {
                let (rect, _) =
                    ui.allocate_exact_size(egui::vec2(10.0, 10.0), egui::Sense::hover());
                ui.painter().circle_filled(rect.center(), 4.5, color);
                ui.label(text);
            });
        };
        if let Some(e) = &st.error {
            dot(ui, RED, format!("Arrêtée : {e}"));
            return;
        }
        if !st.running {
            dot(ui, MUTE, "Arrêtée".into());
            return;
        }
        if st.ets.is_empty() {
            dot(ui, AMBER, "ETS : en attente de connexion".into());
        } else {
            dot(
                ui,
                GREEN,
                format!("ETS : connecté (tunnel {})", st.ets.join(", ")),
            );
        }
        match &st.page {
            Some(origin) => dot(ui, GREEN, format!("Schéma : relié ({origin})")),
            None => dot(
                ui,
                AMBER,
                "Schéma : aucun, cliquez sur « Relier à ETS » dans un schéma".into(),
            ),
        }
        ui.label(
            RichText::new(format!(
                "Télégrammes : {} reçus d'ETS, {} transmis à ETS",
                st.from_ets, st.to_ets
            ))
            .color(MUTE),
        );
    }

    fn instructions(&self, ui: &mut egui::Ui) {
        let s = &self.applied;
        let ip = if s.remote_ets {
            bridge::network_ip().map_or_else(
                || "l'adresse IP de cet ordinateur".into(),
                |ip| ip.to_string(),
            )
        } else {
            "127.0.0.1".into()
        };
        ui.label(RichText::new("Dans ETS").strong());
        ui.label(format!(
            "Connexion Tunneling IP, adresse {ip}, port {}, sans NAT. Dans un projet ETS 6.4 : \
             bouton des connexions à droite de la barre d'outils > Gérer les connexions \
             configurées > Ajouter. Puis Panneaux > Moniteurs > Moniteur de Groupe > Démarrer.",
            s.tunnel_port
        ));
        if s.remote_ets {
            ui.label(format!(
                "Depuis cet ordinateur, l'adresse 127.0.0.1 convient aussi. Le pare-feu de Windows \
                 doit laisser passer le port UDP {}.",
                s.tunnel_port
            ));
        }
        ui.horizontal(|ui| {
            if ui.button("Copier l'adresse pour ETS").clicked() {
                ui.ctx().copy_text(format!("{ip}:{}", s.tunnel_port));
            }
        });
        ui.add_space(6.0);
        ui.label(RichText::new("Dans le schéma").strong());
        ui.label(
            "Ouvrir le schéma (concepteur, lecteur, page de cours ou fichier) et cliquer sur \
             « Relier à ETS » dans sa barre d'outils. Puis « Adresses pour ETS », à importer dans \
             le projet ETS (clic droit sur Adresses de Groupe > Importer Adresses de Groupe).",
        );
        if s.ws_port != crate::settings::WS_PORT {
            ui.label(
                RichText::new(format!(
                    "Port du programme modifié : dans le schéma, indiquer le port {} quand il le demande.",
                    s.ws_port
                ))
                .color(AMBER),
            );
        }
    }

    fn settings(&mut self, ui: &mut egui::Ui) {
        egui::Grid::new("settings")
            .num_columns(2)
            .spacing([12.0, 6.0])
            .show(ui, |ui| {
                ui.label("Port pour ETS (UDP)");
                ui.add(egui::DragValue::new(&mut self.edit.tunnel_port).range(1024..=65535));
                ui.end_row();
                ui.label("Port pour les schémas");
                ui.add(egui::DragValue::new(&mut self.edit.ws_port).range(1024..=65535));
                ui.end_row();
            });
        ui.label(
            RichText::new(
                "3672 ne gêne pas KNX Virtual (3671). Le port des schémas ne sert que sur cet ordinateur.",
            )
            .color(MUTE),
        );
        ui.add_space(4.0);
        ui.checkbox(
            &mut self.edit.remote_ets,
            "Accepter ETS depuis un autre ordinateur du réseau",
        );
        if self.edit.remote_ets {
            ui.label(
                RichText::new(
                    "Tout ordinateur du réseau pourra alors envoyer des télégrammes au schéma. \
                     Cela ne touche aucune installation réelle : seul le schéma est concerné.",
                )
                .color(AMBER),
            );
        }
        ui.add_space(4.0);
        ui.label("Sites autorisés à relier un schéma, un par ligne (https://site.exemple) :");
        ui.add(
            egui::TextEdit::multiline(&mut self.origins_text)
                .desired_rows(2)
                .desired_width(f32::INFINITY),
        );
        ui.label(
            RichText::new(format!(
                "Toujours autorisés : fichiers ouverts depuis l'ordinateur, pages servies sur cet \
                 ordinateur, {PUBLISHED}."
            ))
            .color(MUTE),
        );
        ui.checkbox(
            &mut self.edit.verbose,
            "Journal détaillé (chaque télégramme)",
        );
        ui.add_space(4.0);
        ui.horizontal(|ui| {
            if ui.button("Appliquer").clicked() {
                self.apply();
            }
            if ui.button("Valeurs par défaut").clicked() {
                self.edit = Settings::default();
                self.origins_text.clear();
            }
        });
        if let Some((text, ok)) = &self.note {
            ui.label(RichText::new(text).color(if *ok { GREEN } else { RED }));
        }
    }

    fn journal(&self, ui: &mut egui::Ui, st: &bridge::Status) {
        ui.horizontal(|ui| {
            ui.label(RichText::new("Journal").strong());
            if ui.small_button("Copier").clicked() {
                ui.ctx()
                    .copy_text(st.log.iter().cloned().collect::<Vec<_>>().join("\n"));
            }
        });
        egui::ScrollArea::vertical()
            .stick_to_bottom(true)
            .auto_shrink([false, false])
            .show(ui, |ui| {
                for line in &st.log {
                    ui.label(RichText::new(line).monospace().size(12.0));
                }
            });
    }
}

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        ui.ctx().request_repaint_after(Duration::from_millis(300));
        let st = self.shared.get();
        egui::Panel::top("status").show(ui, |ui| {
            ui.add_space(6.0);
            self.header(ui, &st);
            ui.add_space(6.0);
        });
        egui::Panel::bottom("journal")
            .resizable(true)
            .default_size(150.0)
            .show(ui, |ui| self.journal(ui, &st));
        egui::CentralPanel::default().show(ui, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                self.instructions(ui);
                ui.add_space(8.0);
                egui::CollapsingHeader::new("Réglages")
                    .default_open(st.error.is_some())
                    .show(ui, |ui| self.settings(ui));
            });
        });
    }

    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        if let Some(b) = self.bridge.take() {
            b.stop();
        }
    }
}

/// Open the window; returns when it is closed.
pub fn run(settings: Settings) -> Result<(), String> {
    let shared = Shared::new(false);
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title(concat!("BusDiagram ⇄ ETS ", env!("CARGO_PKG_VERSION")))
            .with_inner_size([620.0, 620.0])
            .with_min_inner_size([460.0, 420.0]),
        renderer: eframe::Renderer::Glow,
        ..Default::default()
    };
    eframe::run_native(
        "BusDiagram-ETS",
        options,
        Box::new(move |_cc| Ok(Box::new(App::new(settings, shared)))),
    )
    .map_err(|e| e.to_string())
}
