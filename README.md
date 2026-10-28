# VectorLab

A bilingual (English / العربية) vector calculator built for the **Egyptian Thanaweya Amma** mathematics syllabus. It computes the dot product, the cross product and the angle between two vectors — with a complete, written-out solution and an interactive 3D picture.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
cd vectorlab
python -m http.server 8765
```

Then visit `http://127.0.0.1:8765`.

No build step, no dependencies. Google Fonts is loaded when available; system fonts are used offline.

Made by **Marwan** for **EL Pop**.

Want a site like this? Contact **01020388764**.

## What it does

- **Home page** with icon cards to pick a tool:
  - **Two vectors** — dot product, cross product, angle between
  - **Three vectors** — scalar triple product `(A × B) · C` and vector triple product `A × (B × C)`
- Routes use the URL hash: `#/`, `#/two/dot`, `#/two/cross`, `#/two/angle`, `#/three/scalar`, `#/three/vector`
- **Three-vector tool**: full step-by-step solution, box volume / coplanar check, `BAC − CAB` check, and its own 3D graph (parallelepiped or plane of B and C)
- **Full-screen graph** for both tools (button on the graph panel, `Esc` to exit)
- **Dot product** `A · B = a₁b₁ + a₂b₂ + a₃b₃`
- **Cross product** `A × B` via the i, j, k determinant, including the 2D case
- **Angle between two vectors** with `cos θ = (A · B) / (|A||B|)`
- **2D and 3D** inputs, negatives and decimals supported
- **Step-by-step solution** for every operation: formula → substitution → calculation → result → meaning
- **Live results** while typing, with magnitudes, scalar projection, parallelogram and triangle areas, radians and more
- **Interactive 3D view**: larger canvas, drag to rotate, double-click to reset, and zoom in/out with buttons or the mouse wheel; shows the parallelogram area, the angle arc, the projection of A on B and the right-hand-rule direction
- **Random vectors** button for quick examples in 2D or 3D
- **Presets** for right angles, parallel vectors, a 3D example and a 2D textbook example
- **Arabic / English** with full RTL layout
- **Light / dark theme**, remembered between visits
- **Copy answer** to the clipboard
- Inputs, operation, dimension and theme are saved in `localStorage`

## Notes for the curriculum

- Angles are reported in degrees, with the `0° ≤ θ ≤ 180°` range.
- The cross product answer is shown as a vector. For 2D vectors it points along **k**, and its magnitude is the area of the parallelogram.
- If `A × B = 0`, the app notes that the vectors are parallel and the area is zero.
- If a vector is zero, the angle is reported as undefined instead of producing a misleading number.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Structure and all UI text hooks |
| `styles.css` | Layout, themes, RTL and responsive styling |
| `i18n.js` | English and Arabic strings |
| `math.js` | Number formatting, vector maths and math markup |
| `app.js` | Two-vector state, solutions, canvas rendering and UI events |
| `triple.js` | Three-vector tool: maths, steps, results and 3D graph |
| `nav.js` | Home / tool routing and full-screen graph |
