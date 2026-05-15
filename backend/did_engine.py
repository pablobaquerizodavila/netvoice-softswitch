"""
Motor de asignación de DIDs desde did_ranges de Asterisk
"""
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os, uuid, logging

load_dotenv()
logger = logging.getLogger("netvoice.did")

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")

engine_ast = create_engine(
    f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/asterisk",
    pool_pre_ping=True
)
SessionAst = sessionmaker(bind=engine_ast)

PROVINCIA_DEFAULT = "GUAYAS"

CIUDAD_TO_PROVINCIA = {
    "guayaquil": "GUAYAS", "samborondon": "GUAYAS", "duran": "GUAYAS",
    "quito": "PICHINCHA", "sangolqui": "PICHINCHA",
    "cuenca": "AZUAY",
    "ambato": "TUNGURAHUA",
    "riobamba": "CHIMBORAZO",
    "ibarra": "IMBABURA",
    "esmeraldas": "ESMERALDAS",
    "loja": "LOJA",
    "machala": "EL ORO",
    "manta": "MANABI", "portoviejo": "MANABI",
    "babahoyo": "LOS RIOS",
    "santa rosa": "EL ORO",
    "santo domingo": "SANTO DOMINGO",
    "latacunga": "COTOPAXI",
    "nueva loja": "SUCUMBIOS",
    "tena": "TENA",
    "puyo": "PASTAZA",
    "guaranda": "BOLIVAR",
    "santa elena": "SANTA ELENA", "salinas": "SANTA ELENA",
}


def _get_provincia(provincia: str = None, ciudad: str = None) -> str:
    if provincia:
        return provincia.upper().strip()
    if ciudad:
        return CIUDAD_TO_PROVINCIA.get(ciudad.lower().strip(), PROVINCIA_DEFAULT)
    return PROVINCIA_DEFAULT


def assign_did(provincia: str = None, ciudad: str = None,
               cliente_id_asterisk: int = None,
               trunk_id_asterisk: int = None) -> dict | None:
    """
    Asigna el siguiente DID disponible de did_ranges.
    Retorna dict con did_completo, range_id, codigo_area, provincia
    o None si no hay disponibles.
    """
    prov = _get_provincia(provincia, ciudad)
    db = SessionAst()

    try:
        # Buscar rango con disponibles en esa provincia
        rango = db.execute(text("""
            SELECT id, codigo_area, serie_inicio, serie_fin, provincia
            FROM did_ranges
            WHERE activo = 'yes'
              AND cantidad_usada < cantidad_total
              AND provincia = :prov
            ORDER BY serie_inicio ASC
            LIMIT 1
        """), {"prov": prov}).fetchone()

        # Si no hay en esa provincia, buscar en cualquiera
        if not rango:
            logger.warning(f"No hay DIDs en {prov}, buscando en pool general")
            rango = db.execute(text("""
                SELECT id, codigo_area, serie_inicio, serie_fin, provincia
                FROM did_ranges
                WHERE activo = 'yes'
                  AND cantidad_usada < cantidad_total
                ORDER BY cantidad_usada ASC, serie_inicio ASC
                LIMIT 1
            """)).fetchone()

        if not rango:
            logger.error("No hay DIDs disponibles en ningún rango")
            return None

        range_id    = rango.id
        codigo_area = rango.codigo_area
        inicio      = int(rango.serie_inicio)
        fin         = int(rango.serie_fin)

        # Obtener números ya usados en este rango
        usados = db.execute(text("""
            SELECT did_completo FROM did_asignados
            WHERE range_id = :rid AND estado != 'disponible'
        """), {"rid": range_id}).fetchall()
        usados_set = {r.did_completo for r in usados}

        # Encontrar siguiente libre
        did_final = None
        for num in range(inicio, fin + 1):
            candidato = f"593{codigo_area}{num}"
            if candidato not in usados_set:
                did_final = candidato
                break

        if not did_final:
            logger.error(f"Rango {range_id} agotado")
            return None

        # Insertar en did_asignados
        db.execute(text("""
            INSERT INTO did_asignados
            (did_completo, range_id, cliente_id, trunk_id, estado)
            VALUES (:did, :range_id, :cliente_id, :trunk_id, 'asignado')
        """), {
            "did":        did_final,
            "range_id":   range_id,
            "cliente_id": cliente_id_asterisk,
            "trunk_id":   trunk_id_asterisk
        })

        # Actualizar contador
        db.execute(text("""
            UPDATE did_ranges
            SET cantidad_usada = cantidad_usada + 1
            WHERE id = :id
        """), {"id": range_id})

        db.commit()

        logger.info(f"DID asignado: {did_final} | rango:{range_id} | prov:{rango.provincia}")

        return {
            "did_completo": did_final,
            "did_e164":     f"+{did_final}",
            "range_id":     range_id,
            "codigo_area":  codigo_area,
            "provincia":    rango.provincia
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error asignando DID: {e}")
        return None
    finally:
        db.close()


def release_did(did_completo: str) -> bool:
    """Liberar un DID asignado"""
    db = SessionAst()
    try:
        result = db.execute(text("""
            UPDATE did_asignados
            SET estado = 'disponible', fecha_liberacion = NOW()
            WHERE did_completo = :did AND estado = 'asignado'
        """), {"did": did_completo})

        if result.rowcount > 0:
            did_row = db.execute(text("""
                SELECT range_id FROM did_asignados WHERE did_completo = :did
            """), {"did": did_completo}).fetchone()
            if did_row:
                db.execute(text("""
                    UPDATE did_ranges
                    SET cantidad_usada = GREATEST(0, cantidad_usada - 1)
                    WHERE id = :id
                """), {"id": did_row.range_id})

        db.commit()
        return result.rowcount > 0
    except Exception as e:
        db.rollback()
        logger.error(f"Error liberando DID {did_completo}: {e}")
        return False
    finally:
        db.close()


def list_available_provinces() -> list:
    """Lista de provincias con DIDs disponibles"""
    db = SessionAst()
    try:
        rows = db.execute(text("""
            SELECT provincia, codigo_area,
                   SUM(cantidad_total - cantidad_usada) as disponibles
            FROM did_ranges
            WHERE activo = 'yes'
            GROUP BY provincia, codigo_area
            HAVING disponibles > 0
            ORDER BY provincia
        """)).fetchall()
        return [dict(r._mapping) for r in rows]
    finally:
        db.close()
