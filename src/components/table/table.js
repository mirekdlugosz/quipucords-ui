import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useShallowCompareEffect } from 'react-use';
import _cloneDeep from 'lodash/cloneDeep';
import { Grid, GridItem } from '@patternfly/react-core';
import { ExpandableRowContent, SortByDirection, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Table as PfTable } from '@patternfly/react-table/deprecated';
import { TableEmpty } from './tableEmpty';
import { tableHelpers } from './tableHelpers';

/**
 * FixMe: PF bug for select column. PF requires a Th used for select field in the primary Thead...
 * BUT also allows a partially working Td. Any attempt to update the Td selected object props is
 * met with a partially-functioning field, hair pulling, and the question "is my state working?"
 * ... it is, PF is the problem, this is a bug. HTML markup does allow the use of both td and th within
 * thead and tbody, and not every cell in a thead requires the use of th. Solutions include
 *   - minimally updating the documentation to reflect that a Th is ABSOLUTELY required!
 *   - allow Td cells the same functionality as Th in Thead
 *   - completely warn/block the ability to use Td in the Thead component
 */
/**
 * A PF Composable table wrapper
 *
 * @param {object} props
 * @param {string} props.ariaLabel
 * @param {React.ReactNode} props.children
 * @param {string} props.className
 * @param {Array} props.columnHeaders
 * @param {object} props.componentClassNames
 * @param {boolean} props.isBorders
 * @param {boolean} props.isHeader
 * @param {boolean} props.isStriped
 * @param {Function} props.onSelect
 * @param {Function} props.onSort
 * @param {Function} props.onExpand
 * @param {Array} props.rows
 * @param {string} props.summary
 * @param {string} props.variant
 * @returns {React.ReactNode}
 */
const Table = ({
  ariaLabel,
  children,
  className,
  columnHeaders,
  componentClassNames,
  isBorders,
  isHeader,
  isStriped,
  onSelect,
  onSort,
  onExpand,
  rows,
  summary,
  variant
}) => {
  const [updatedHeaderAndRows, setUpdatedHeaderAndRows] = useState({});
  const [updatedIsExpandableRow, setUpdatedIsExpandableRow] = useState(false);
  const [updatedIsExpandableCell, setUpdatedIsExpandableCell] = useState(false);
  const [updatedIsSelectTable, setUpdatedIsSelectTable] = useState(false);

  /**
   * Apply an onExpand handler.
   *
   * @param {object} params
   * @param {string} params.type
   * @param {boolean} params.isExpanded
   * @param {number} params.rowIndex
   * @param {number} params.cellIndex
   * @param {*|object} params.data
   */
  const onExpandTable = ({ type, isExpanded, rowIndex, cellIndex, data } = {}) => {
    if (type === 'compound') {
      setUpdatedHeaderAndRows(prevState => {
        const nextBodyRows = [...prevState.bodyRows];
        const nextBodyRowCells = nextBodyRows?.[rowIndex].cells.map(({ props: cellProps, ...cell }) => {
          const updatedCompoundExpand = cellProps?.compoundExpand;

          if (updatedCompoundExpand) {
            updatedCompoundExpand.isExpanded = false;
          }

          return { ...cell, props: { ...cellProps, compoundExpand: updatedCompoundExpand } };
        });

        nextBodyRowCells[cellIndex].props.compoundExpand.isExpanded = isExpanded;
        nextBodyRows[rowIndex].cells = nextBodyRowCells;

        return {
          ...prevState,
          bodyRows: nextBodyRows
        };
      });
    } else {
      setUpdatedHeaderAndRows(prevState => {
        const nextBodyRows = [...prevState.bodyRows];
        nextBodyRows[rowIndex].expand.isExpanded = isExpanded;

        return {
          ...prevState,
          bodyRows: nextBodyRows
        };
      });
    }

    if (typeof onExpand === 'function') {
      onExpand({
        type,
        rowIndex,
        cellIndex: (type === 'row' && -1) || cellIndex,
        isExpanded,
        data: _cloneDeep(data)
      });
    }
  };

  /**
   * Apply an onSelect handler.
   *
   * @param {object} params
   * @param {string} params.type
   * @param {boolean} params.isSelected
   * @param {number} params.rowIndex
   * @param {*|object} params.data
   */
  const onSelectTable = ({ type, isSelected, rowIndex, data } = {}) => {
    if (type === 'all') {
      setUpdatedHeaderAndRows(prevState => {
        const nextBodyRows = prevState.bodyRows?.map(row => ({
          ...row,
          select: { ...row.select, isSelected }
        }));

        const nextHeaderSelectProps = prevState.headerSelectProps;
        nextHeaderSelectProps.isSelected = isSelected;

        return {
          ...prevState,
          bodyRows: nextBodyRows,
          headerSelectProps: nextHeaderSelectProps
        };
      });
    } else {
      setUpdatedHeaderAndRows(prevState => {
        const nextBodyRows = prevState.bodyRows?.map(row => row);
        nextBodyRows[rowIndex].select.isSelected = isSelected;

        const nextHeaderSelectProps = prevState.headerSelectProps;
        nextHeaderSelectProps.isSelected =
          nextBodyRows.filter(row => row.select.isSelected === true).length === nextBodyRows.length;

        return {
          ...prevState,
          bodyRows: nextBodyRows,
          headerSelectProps: nextHeaderSelectProps
        };
      });
    }

    onSelect({
      type,
      rowIndex,
      isSelected,
      data: _cloneDeep(data)
    });
  };

  /**
   * Apply an onSort handler.
   *
   * @param {object} params
   * @param {number} params.cellIndex
   * @param {string} params.direction
   * @param {number} params.originalIndex
   * @param {*|object} params.data
   */
  const onSortTable = ({ cellIndex, direction, originalIndex, data } = {}) => {
    setUpdatedHeaderAndRows(prevState => {
      const nextHeaderRow = prevState.headerRow.map((headerCell, index) => {
        const updatedHeaderCell = headerCell;

        if (updatedHeaderCell?.props?.sort) {
          delete updatedHeaderCell.props.sort.sortBy.index;

          if (index === originalIndex) {
            updatedHeaderCell.props.sort.sortBy.index = cellIndex;
            updatedHeaderCell.props.sort.sortBy.direction = direction;
          }
        }

        return updatedHeaderCell;
      });

      return {
        ...prevState,
        headerRow: nextHeaderRow
      };
    });

    onSort({
      cellIndex: originalIndex,
      direction,
      data: _cloneDeep(data)
    });
  };

  useShallowCompareEffect(() => {
    const {
      isAllSelected: parsedIsAllSelected,
      isExpandableCell: parsedIsExpandableCell,
      isExpandableRow: parsedIsExpandableRow,
      isSelectTable: parsedIsSelectTable,
      rows: parsedRows
    } = tableHelpers.tableRows({
      onExpand: onExpandTable,
      onSelect: typeof onSelect === 'function' && onSelectTable,
      rows
    });
    const { headerRow: parsedHeaderRow, headerSelectProps: parsedHeaderSelectProps } = tableHelpers.tableHeader({
      columnHeaders,
      isAllSelected: parsedIsAllSelected,
      onSelect: typeof onSelect === 'function' && onSelectTable,
      onSort: typeof onSort === 'function' && onSortTable,
      parsedRows
    });

    setUpdatedIsExpandableRow(parsedIsExpandableRow);
    setUpdatedIsSelectTable(parsedIsSelectTable);
    setUpdatedIsExpandableCell(parsedIsExpandableCell);
    setUpdatedHeaderAndRows({
      headerRow: parsedHeaderRow,
      bodyRows: parsedRows,
      headerSelectProps: parsedHeaderSelectProps
    });
  }, [columnHeaders, onExpand, onExpandTable, onSelect, onSelectTable, onSort, onSortTable, rows]);

  /**
   * Apply settings, return primary thead.
   *
   * @returns {React.ReactNode}
   */
  const renderHeader = () => (
    <Thead>
      <Tr className={componentClassNames.tr}>
        {updatedIsExpandableRow && <Td className={componentClassNames.th} key="expand-th-cell" />}
        {updatedIsSelectTable && (
          <Th
            key="select-cell"
            className={`${componentClassNames.th} ${componentClassNames.tdSelect}`}
            select={updatedHeaderAndRows.headerSelectProps}
          />
        )}
        {updatedHeaderAndRows?.headerRow.map(({ key: cellKey, content, props, sort }) => (
          <Th className={componentClassNames.th} key={cellKey} sort={sort} {...props}>
            {content}
          </Th>
        ))}
      </Tr>
    </Thead>
  );

  /**
   * Apply settings, return tbody(s).
   *
   * @returns {React.ReactNode}
   */
  const renderBody = () => {
    const BodyWrapper = ((updatedIsExpandableCell || updatedIsExpandableRow) && React.Fragment) || Tbody;

    return (
      <BodyWrapper>
        {updatedHeaderAndRows?.bodyRows?.map(({ key: rowKey, cells, expand, select, expandedContent }) => {
          const expandedCell =
            (updatedIsExpandableCell && cells.find(cell => cell?.props?.compoundExpand?.isExpanded === true)) ||
            undefined;
          const expandedRow = (updatedIsExpandableRow && expand?.isExpanded === true) || undefined;

          const CellWrapper = ((updatedIsExpandableCell || updatedIsExpandableRow) && Tbody) || React.Fragment;
          const cellWrapperProps =
            (updatedIsExpandableCell && { isExpanded: expandedCell?.props?.compoundExpand?.isExpanded === true }) ||
            (updatedIsExpandableRow && { isExpanded: expand?.isExpanded === true }) ||
            undefined;

          return (
            <CellWrapper key={`${rowKey}-parent-row`} {...cellWrapperProps}>
              <Tr className={componentClassNames.tr} key={`${rowKey}-row`}>
                {expand && (
                  <Td
                    className={`${componentClassNames.td} ${componentClassNames.tdExpand}`}
                    key={`${rowKey}-expand-col`}
                    expand={expand}
                  />
                )}
                {select && (
                  <Td
                    className={`${componentClassNames.td} ${componentClassNames.tdSelect}`}
                    key={`${rowKey}-select-col`}
                    select={select}
                  />
                )}
                {cells.map(({ key: cellKey, content, isTHeader, props: cellProps = {} }) => {
                  const WrapperCell = (isTHeader && Th) || Td;

                  return (
                    <WrapperCell
                      key={cellKey}
                      {...cellProps}
                      className={`${cellProps.className} ${componentClassNames.td} ${
                        (cellProps.isActionCell && componentClassNames.tdAction) || ''
                      }`}
                    >
                      {content}
                    </WrapperCell>
                  );
                })}
              </Tr>
              {updatedIsExpandableRow && expandedRow && (
                <Tr className={componentClassNames.tr} isExpanded key={`${rowKey}-expandedrow`}>
                  <Td
                    noPadding={expandedRow?.props?.noPadding}
                    className={`${componentClassNames.td} ${componentClassNames.tdExpanded} ${componentClassNames.tdExpandedWrapper}`}
                    colSpan={cells.length + ((expand && 1) || 0) + ((select && 1) || 0)}
                  >
                    <div className={componentClassNames.tdExpandedContent}>
                      <ExpandableRowContent>{expandedContent}</ExpandableRowContent>
                    </div>
                  </Td>
                </Tr>
              )}
              {updatedIsExpandableCell && expandedCell && (
                <Tr className={componentClassNames.tr} isExpanded key={`${rowKey}-expandedcol`}>
                  <Td
                    noPadding={expandedCell?.props?.noPadding}
                    className={`${componentClassNames.td} ${componentClassNames.tdExpanded} ${componentClassNames.tdExpandedWrapper}`}
                    colSpan={cells.length + ((expand && 1) || 0) + ((select && 1) || 0)}
                  >
                    <div className={componentClassNames.tdExpandedContent}>
                      <ExpandableRowContent>
                        {(typeof expandedCell.expandedContent === 'function' && expandedCell.expandedContent()) ||
                          expandedCell.expandedContent}
                      </ExpandableRowContent>
                    </div>
                  </Td>
                </Tr>
              )}
            </CellWrapper>
          );
        })}
      </BodyWrapper>
    );
  };

  /**
   * Return empty results display.
   *
   * @returns {React.ReactNode}
   */
  const renderEmpty = () => children || <TableEmpty />;

  return (
    <Grid>
      <GridItem span={12}>
        {(updatedHeaderAndRows?.bodyRows?.length && (
          <PfTable
            aria-label={ariaLabel}
            borders={isBorders}
            className={`${componentClassNames.table} ${className}`}
            isStriped={isStriped}
            summary={summary}
            variant={variant}
          >
            {isHeader && renderHeader()}
            {renderBody()}
          </PfTable>
        )) ||
          renderEmpty()}
      </GridItem>
    </Grid>
  );
};

/**
 * Prop types
 *
 * @type {{componentClassNames: object, summary: string, onSort: Function, onExpand: Function, className: string, isStriped: boolean,
 *     rows: Array, isBorders: boolean, ariaLabel: string, onSelect: Function, columnHeaders: Array, children: React.ReactNode,
 *     isHeader: boolean, variant: string}}
 */
Table.propTypes = {
  ariaLabel: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  columnHeaders: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.node,
      PropTypes.shape({
        content: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
        isSort: PropTypes.bool,
        isSortActive: PropTypes.bool,
        sortDirection: PropTypes.oneOf([...Object.values(SortByDirection)])
      })
    ])
  ),
  componentClassNames: PropTypes.shape({
    table: PropTypes.string,
    td: PropTypes.string,
    tdAction: PropTypes.string,
    tdSelect: PropTypes.string,
    th: PropTypes.string,
    tr: PropTypes.string,
    trExpand: PropTypes.string,
    trExpanded: PropTypes.string,
    trExpandedContent: PropTypes.string,
    tdExpand: PropTypes.string,
    tdExpanded: PropTypes.string,
    tdExpandedWrapper: PropTypes.string,
    tdExpandedContent: PropTypes.string
  }),
  isBorders: PropTypes.bool,
  isHeader: PropTypes.bool,
  isStriped: PropTypes.bool,
  onExpand: PropTypes.func,
  onSelect: PropTypes.func,
  onSort: PropTypes.func,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      cells: PropTypes.arrayOf(
        PropTypes.oneOfType([
          PropTypes.func,
          PropTypes.node,
          PropTypes.instanceOf(Date),
          PropTypes.shape({
            content: PropTypes.oneOfType([PropTypes.func, PropTypes.node, PropTypes.instanceOf(Date)]).isRequired,
            isTHeader: PropTypes.bool,
            isExpanded: PropTypes.bool,
            expandedContent: PropTypes.oneOfType([PropTypes.node, PropTypes.func])
          })
        ])
      ),
      isDisabled: PropTypes.bool,
      isExpanded: PropTypes.bool,
      isSelected: PropTypes.bool,
      expandedContent: PropTypes.oneOfType([PropTypes.node, PropTypes.func])
    })
  ),
  summary: PropTypes.string,
  variant: PropTypes.oneOf([...Object.values(TableVariant)])
};

/**
 * Default props
 *
 * @type {{componentClassNames: {tdExpanded: string, trExpand: string, trExpandedContent: string, tdExpandedWrapper: string,
 *     tdAction: string, tdExpand: string, td: string, trExpanded: string, th: string, tdSelect: string, tdExpandedContent: string,
 *     table: string, tr: string}, summary: null, onSort: null, onExpand: null, className: string, isStriped: boolean, rows: *[],
 *     isBorders: boolean, ariaLabel: null, onSelect: null, columnHeaders: *[], children: null, isHeader: boolean,
 *     variant: TableVariant.compact}}
 */
Table.defaultProps = {
  ariaLabel: null,
  children: null,
  className: '',
  columnHeaders: [],
  componentClassNames: {
    table: 'quipucords-table',
    td: 'quipucords-table__td',
    tdAction: 'quipucords-table__td-action',
    tdSelect: 'quipucords-table__td-select',
    th: 'quipucords-table__th',
    tr: 'quipucords-table__tr',
    trExpand: 'quipucords-table__tr-expand',
    trExpanded: 'quipucords-table__tr-expand-expanded',
    trExpandedContent: 'quipucords-table__tr-expand-content',
    tdExpand: 'quipucords-table__td-expand',
    tdExpanded: 'quipucords-table__td-expand-expanded',
    tdExpandedWrapper: 'quipucords-table__td-expand-wrapper',
    tdExpandedContent: 'quipucords-table__td-expand-content'
  },
  isBorders: true,
  isHeader: false,
  isStriped: false,
  onExpand: null,
  onSelect: null,
  onSort: null,
  rows: [],
  summary: null,
  variant: TableVariant.compact
};

export { Table as default, Table, TableVariant };
