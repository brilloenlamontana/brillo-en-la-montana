# Prendas con huesos de tela de cada avatar (ver tela.py). Medidas en unidades del esqueleto canonico (cadera a 0,58;
# el personaje mira a -Y, la espalda queda en +Y). `semillas`: puntos cuya pieza de malla mas cercana es la prenda
# ('ymax' = la pieza que llega mas atras); sin semillas, toda la malla menos la piel de piernas y brazos.
CAPA = dict(tipo='cortina', padre='Spine2', sector='atras', tipo_sim='capa')
FALDA = dict(tipo='cortina', padre='Hips', sector='vuelta', tipo_sim='falda')
COLA = dict(tipo='cola', padre='Hips', semillas=['ymax'], huesos=6, desde=0.08, tipo_sim='cola')

MODELOS = {
    'Elfo': {'capa': dict(CAPA, semillas=[(0, 0.15, 0.2)], z_top=0.78, cadenas=5, huesos=4)},
    'Elfa': {'capa': dict(CAPA, semillas=[(0, 0.15, 0.2)], z_top=0.76, cadenas=4, huesos=4)},
    'Draconia': {
        'cola': dict(COLA, semillas=['ymax', (0.22, 0.23, 0.345)]),
        'capa': dict(CAPA, semillas=[(0, 0.1, 0.1)], z_top=0.76, cadenas=5, huesos=4),
    },
    'Draconiano': {
        'cola': dict(COLA, y_min=0.04, desde=0.0),
        'abrigo': dict(FALDA, z_top=0.55, r_pierna=0.09, cadenas=8, huesos=3),
    },
    'Gnoma': {'capa': dict(CAPA, padre='Spine1', z_top=0.72, y_min=0.0, r_pierna=0.08, r_brazo=0.06, r_min=0.12, cadenas=5, huesos=3)},
    'Humano': {'tunica': dict(FALDA, z_top=0.55, r_pierna=0.085, cadenas=6, huesos=3)},
    'Tiflina': {
        'cola': dict(COLA),
        'falda': dict(FALDA, z_top=0.57, r_pierna=0.085, cadenas=6, huesos=3),
    },
    'Tiflin': {'cola': dict(COLA)},
    'Enana': {'falda': dict(FALDA, z_top=0.55, r_pierna=0.1, cadenas=6, huesos=3)},
    'Enano': {'falda': dict(FALDA, semillas=[(0, 0.16, 0.4)], z_top=0.58, cadenas=6, huesos=2)},
}
