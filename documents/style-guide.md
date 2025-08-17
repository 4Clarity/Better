---
title: TIP Style Guide
description: The complete style guide and foundational design system for the Transition Intelligence Platform (TIP).
feature: Design System
last-updated: 2025-08-16
version: 1.0
status: draft
---

# **TIP Style Guide**

## **Overview**
This document outlines the visual and interactive design standards for the Transition Intelligence Platform (TIP). Our design philosophy is rooted in **bold simplicity**, creating a frictionless, intuitive, and accessible experience for all users. The system is designed to be clean, professional, and trustworthy, prioritizing content and user tasks over decorative elements.

## **Table of Contents**
1.  [Color System](#1-color-system)
2.  [Typography System](#2-typography-system)
3.  [Spacing & Layout System](#3-spacing--layout-system)
4.  [Core Component Principles](#4-core-component-principles)
5.  [Motion & Animation System](#5-motion--animation-system)

---

## **1. Color System**
The color palette is designed to be professional, accessible, and clear. It uses a stable blue as the primary color to build trust, with a neutral gray palette for a clean interface and vibrant accents for interactive elements.

### **Primary Colors**
- **Primary**: `#0A58D0` – Main CTAs, brand elements, active navigation
- **Primary Dark**: `#0848A8` – Hover states, emphasis
- **Primary Light**: `#E7F0FD` – Subtle backgrounds, highlights

### **Accent Colors**
- **Accent**: `#17A2B8` – Important secondary actions, notifications, progress indicators

### **Semantic Colors**
- **Success**: `#28A745` – Positive actions, confirmations, approvals
- **Warning**: `#FFC107` – Caution states, non-critical alerts
- **Error**: `#DC3545` – Errors, destructive actions, rejections
- **Info**: `#17A2B8` – Informational messages and highlights

### **Neutral Palette**
- **Neutral-900**: `#111827` – Primary text
- **Neutral-700**: `#374151`` – Secondary text, icons
- **Neutral-500**: `#6B7280` – Tertiary text, disabled states
- **Neutral-300**: `#D1D5DB` – Borders, dividers
- **Neutral-200**: `#E5E7EB` – Subtle borders, hover backgrounds
- **Neutral-100**: `#F3F4F6` – Light backgrounds
- **Neutral-50**: `#F9FAFB` – Page backgrounds
- **White**: `#FFFFFF` – Card backgrounds, primary surfaces

### **Accessibility Notes**
- All primary color combinations with white or light neutral text meet WCAG AA standards (contrast ratio > 4.5:1).
- Semantic color usage on light backgrounds is WCAG AA compliant.
- Critical interactions should target a 7:1 contrast ratio where possible.

---

## **2. Typography System**
The typography system is built for clarity, hierarchy, and readability across all devices. We use **Public Sans**, an open-source font designed for the U.S. government, to reinforce a professional and trustworthy aesthetic.

### **Font Stack**
- **Primary**: `'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Monospace**: `'JetBrains Mono', Consolas, monospace`

### **Type Scale (Base: 16px)**
- **H1**: `36px/1.2, Bold (700)` – Page titles
- **H2**: `24px/1.3, Semibold (600)` – Section headers
- **H3**: `20px/1.4, Semibold (600)` – Subsection headers
- **H4**: `18px/1.4, Medium (500)` – Card titles
- **Body Large**: `18px/1.6` – Article/long-form text
- **Body**: `16px/1.6` – Standard UI text, paragraphs
- **Body Small**: `14px/1.5` – Secondary information, captions
- **Label**: `12px/1.5, Semibold (600), uppercase, letter-spacing: 0.5px` – Form labels, tags

---

## **3. Spacing & Layout System**
A consistent spacing system based on an **8px grid** creates visual rhythm and order.

### **Base Unit**: `8px`

### **Spacing Scale**
- **xs**: `4px` (0.5x) – Micro spacing (e.g., between an icon and its label)
- **sm**: `8px` (1x) – Small padding, spacing within components
- **md**: `16px` (2x) – Default spacing between elements
- **lg**: `24px` (3x) – Spacing between larger components or sections
- **xl**: `32px` (4x) – Major section separation
- **2xl**: `48px` (6x) – Page padding on larger screens
- **3xl**: `64px` (8x) – Spacing for hero sections or significant visual separation

### **Grid System**
- **Columns**: 12 (desktop), 8 (tablet), 4 (mobile)
- **Gutters**: `24px` (desktop), `16px` (tablet/mobile)
- **Container Max-widths**: `1280px`

### **Breakpoints**
- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

---

## **4. Core Component Principles**
While individual components will be specified separately, all components must adhere to these core principles.

- **Border Radius**:
    - **Standard**: `8px` for primary containers like cards and modals.
    - **Small**: `4px` for internal elements like buttons and input fields.
- **Shadows (Elevation)**: A subtle shadow system will be used to indicate interactivity and elevation.
    - **`shadow-sm`**: For interactive elements on hover.
    - **`shadow-md`**: For default card and container elevation.
    - **`shadow-lg`**: For modals and dropdowns that sit above the main content.
- **States**: All interactive components MUST have visually distinct states for `default`, `hover`, `focus`, `active`, and `disabled`. Focus states must be highly visible for accessibility.

---

## **5. Motion & Animation System**
Motion should be purposeful, guiding the user and providing feedback without being distracting.

- **Timing Functions**:
    - **Ease-out**: `cubic-bezier(0.0, 0, 0.2, 1)` – For elements entering the screen.
    - **Ease-in-out**: `cubic-bezier(0.4, 0, 0.6, 1)` – For elements moving or changing state on screen.
- **Duration Scale**:
    - **Short**: `150ms` – State changes, hover effects.
    - **Medium**: `300ms` – Local transitions, expansions (e.g., accordions).
- **Accessibility**: All animations must respect the `prefers-reduced-motion` media query. When reduced motion is enabled, animations should be disabled or replaced with simple cross-fades.