use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputProfile {
    pub vector2: Vec<Vector2InputBinding>,
}

impl Default for InputProfile {
    fn default() -> Self {
        Self {
            vector2: vec![
                Vector2InputBinding {
                    id: "look".to_string(),
                    label: "Look".to_string(),
                    sources: vec![
                        Vector2InputSource::MouseMotion {
                            scale: 1.0,
                            invert_x: false,
                            invert_y: false,
                        },
                        Vector2InputSource::GamepadStick {
                            device_id: None,
                            stick: Stick::Right,
                            deadzone: 0.15,
                            scale: 24.0,
                            invert_x: false,
                            invert_y: false,
                        },
                    ],
                },
                Vector2InputBinding {
                    id: "move".to_string(),
                    label: "Move".to_string(),
                    sources: vec![
                        Vector2InputSource::KeyboardWasd {
                            scale: 1.0,
                            invert_x: false,
                            invert_y: false,
                        },
                        Vector2InputSource::GamepadStick {
                            device_id: None,
                            stick: Stick::Left,
                            deadzone: 0.15,
                            scale: 1.0,
                            invert_x: false,
                            invert_y: false,
                        },
                    ],
                },
            ],
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vector2InputBinding {
    pub id: String,
    pub label: String,
    pub sources: Vec<Vector2InputSource>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Vector2InputSource {
    MouseMotion {
        scale: f64,
        invert_x: bool,
        invert_y: bool,
    },
    KeyboardWasd {
        scale: f64,
        invert_x: bool,
        invert_y: bool,
    },
    GamepadStick {
        device_id: Option<usize>,
        stick: Stick,
        deadzone: f64,
        scale: f64,
        invert_x: bool,
        invert_y: bool,
    },
}

#[derive(Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Stick {
    Left,
    Right,
}

pub fn sanitize_profile(profile: InputProfile) -> InputProfile {
    let mut vector2 = profile
        .vector2
        .into_iter()
        .filter_map(|mut binding| {
            binding.id = binding.id.trim().to_string();
            binding.label = binding.label.trim().to_string();

            if binding.id.is_empty() {
                return None;
            }

            if binding.label.is_empty() {
                binding.label = binding.id.clone();
            }

            binding.sources = binding.sources.into_iter().map(sanitize_source).collect();

            Some(binding)
        })
        .collect::<Vec<_>>();

    if vector2.is_empty() {
        vector2 = InputProfile::default().vector2;
    }

    InputProfile { vector2 }
}

fn sanitize_source(source: Vector2InputSource) -> Vector2InputSource {
    match source {
        Vector2InputSource::MouseMotion {
            scale,
            invert_x,
            invert_y,
        } => Vector2InputSource::MouseMotion {
            scale: sanitize_scale(scale),
            invert_x,
            invert_y,
        },
        Vector2InputSource::KeyboardWasd {
            scale,
            invert_x,
            invert_y,
        } => Vector2InputSource::KeyboardWasd {
            scale: sanitize_scale(scale),
            invert_x,
            invert_y,
        },
        Vector2InputSource::GamepadStick {
            device_id,
            stick,
            deadzone,
            scale,
            invert_x,
            invert_y,
        } => Vector2InputSource::GamepadStick {
            device_id,
            stick,
            deadzone: deadzone.clamp(0.0, 0.95),
            scale: sanitize_scale(scale),
            invert_x,
            invert_y,
        },
    }
}

fn sanitize_scale(scale: f64) -> f64 {
    if scale.is_finite() {
        scale.clamp(0.0, 1000.0)
    } else {
        1.0
    }
}
