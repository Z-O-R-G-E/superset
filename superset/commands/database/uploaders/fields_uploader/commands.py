import logging
import pandas as pd

from functools import partial
from typing import Any, Optional
from flask_babel import lazy_gettext as _

from superset import db
from superset.commands.base import BaseCommand
from superset.commands.database.exceptions import (
    DatabaseNotFoundError,
    DatabaseUploadFailed,
    DatabaseUploadSaveMetadataFailed,
)
from superset.commands.database.uploaders.fields_uploader.readers import FieldsReader
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.models.core import Database
from superset.utils.core import get_user
from superset.utils.decorators import on_error, transaction


logger = logging.getLogger(__name__)

class FieldsUploadCommand(BaseCommand):
    """Команда загрузки полей"""

    def __init__(
            self,
            model_id: int,
            dbms: str,
            table_name: str,
            upload_fields: Any,
            schema: Optional[str],
            reader: FieldsReader,
    ) -> None:
        self._model_id = model_id
        self._dbms = dbms
        self._model: Optional[Database] = None
        self._table_name = table_name
        self._schema = schema
        self._fields = upload_fields
        self._reader = reader

    @transaction(on_error=partial(on_error, reraise=DatabaseUploadSaveMetadataFailed))
    def run(self) -> None:
        """Выполнить команду загрузки"""
        self.validate()
        if not self._model:
            return

        self._reader.read(self._model, self._schema, self._table_name, self._fields)
        self._create_or_update_sqla_table()

    def _create_or_update_sqla_table(self) -> None:
        """Создать или обновить метаданные таблицы"""
        sqla_table = (
            db.session.query(SqlaTable)
            .filter_by(
                table_name=self._table_name,
                schema=self._schema,
                database_id=self._model_id,
            )
            .one_or_none()
        )

        if not sqla_table:
            sqla_table = SqlaTable(
                table_name=self._table_name,
                database=self._model,
                database_id=self._model_id,
                owners=[get_user()],
                schema=self._schema,
            )
            db.session.add(sqla_table)

        try:
            sqla_table.fetch_metadata()
            db.session.commit()
        except Exception as ex:
            db.session.rollback()
            logger.exception("Не удалось сохранить метаданные таблицы.")
            raise DatabaseUploadSaveMetadataFailed() from ex

    def validate(self) -> None:
        """Проверить входные параметры"""
        self._model = DatabaseDAO.find_by_id(self._model_id)
        if not self._model:
            raise DatabaseNotFoundError()
        if not self._table_name or not isinstance(self._table_name, str):
            raise DatabaseUploadFailed(message=_("Имя таблицы должно быть указано"))
        if not isinstance(self._fields, list) or not self._fields:
            raise DatabaseUploadFailed(message=_("Не указаны поля для загрузки"))
