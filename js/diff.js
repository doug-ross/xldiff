// JS diff utilities
// 2015-05-07 DR beta release
//

// Returns an array of column names for a given header.
//
function MapHeaderToColumnNames(sHeader, sDelim) {
	return (MapRowToColumns(sHeader, sDelim));
}

// Returns array of indexes that match file 1 with file 2
//   based on column names and our column-name matching approach.
//
function CreateColumnMap(aColumns1, aColumns2, nMatchType) {
	var aMap = [];
	var i, j;
	//
	for (i = 0; i < aColumns1.length; i++) {
		//
		var s1 = aColumns1[i];
		//
		for (j = 0; j < aColumns2.length; j++) {
			var s2 = aColumns2[j];
			//
			//	Exact match?
			//
			if (s1.toLowerCase() == s2.toLowerCase()) {
				aMap[i] = j;
				s1 = true;
				break;
			}
		}
		if (s1 !== true) {
			aMap[i] = -1;
		}
	}
	//
	return (aMap);
	//
}

// Generate a key from one or more fields in the column-indexes array.
//
function GenerateKey(aRow, aColumnIndexes) {
	var sKey = "";
	for (var i = 0; i < aColumnIndexes.length; i++) {
		sKey += aRow[aColumnIndexes[i]];
	}
	return (sKey);
}

// Find a column index based upon a column name.
//		Returns -1 if not found.
//
function GetColumnIndexesFromNames(aColumns, sNames) {
	var aIndex = [];
	var aNames = sNames.split(',');
	var i, n;
	var sName;
	//
	for (n = 0; n < aNames.length; n++) {
		sName = aNames[n].replace(/\s+/g, '');
		for (i = 0; i < aColumns.length; i++) {
			var sTemp = aColumns[i].toLowerCase().replace(/\s+/g, '');
			if (sName.toLowerCase() == sTemp) {
				aIndex.push(i);
				break;
			}
		}
	}
	return (aIndex);
}

// Convert file to array of rows.
//
function MapFileToRows(sFile) {
	var sDelim = "\n";
	if (sFile.indexOf("\r\n") >= 0) {
		sDelim = "\r\n";
	}
	var aLines = sFile.split(sDelim, 999999);
	//
	//	Handle a few blank lines up top.
	//
	for (var i = 0; i < 3; i++) {
		if (aLines[0].length > 18) {
			break;
		}
		aLines.shift();
	}
	return (aLines);
}

// Convert row to array of columns.
//
function MapRowToColumns(sRow, sDelim) {
	if (sDelim == ',') {
		return ($.csv.toArray(sRow));
	} else {
		return (sRow.split(sDelim, 999));
	}
}

// Map header to column names.
//
function GetFileColumnNames(sFile) {
	var		aColumnNames = [];
	var 	aRows;
	var		sDelim;
	do {
		//
		aRows = MapFileToRows(sFile);
		//
		if (1) { // oSettings["delimiter"] === undefined) {
			//
			var a;
			//
			var s = aRows[0];
			sDelim = "\t";
			sDelimPretty = "Tab";
			a = s.split(',');
			if (a.length > 9) {
				sDelim = ",";
				sDelimPretty = "Comma";
			} else {
				a = s.split(";");
				if (a.length > 9) {
					sDelim = ";";
					sDelimPretty = "Semicolon";
				}
			}
			oSettings["delimiter"]			= sDelim;
			oSettings["delimiterpretty"]	= sDelimPretty;
			//
			//
		} else {
			sDelim = oSettings["delimiter"];
		}
		//
		aColumnNames = MapHeaderToColumnNames(aRows[0], sDelim);
		//
	} while (0);
	return (aColumnNames);
}

// Perform conversion.
//		Return object with diff details.
//
function GenerateDiffs(sFile1, sFile2, oSettings) {
	//
	var		a2 = [];
	var		a2index = [];
	var		aColumnMap;
	var		aColumnNames1, aColumnNames2;
	var		aColumns1, aColumns2;
	var		aColumnChangesFile1;
	var		aColumnChangesFile2;
	var		aColumnsIgnore;
	var		aPK1, aPK2;
	var		aRows1, aRows2;
	var		i;
	var		oDiffs = [];
	var		nMatchType;
	var		nRow2;
	var		nRowsThatMatched	= 0;
	var		nRowsChanged		= 0;
	var		nRowsDeleted		= 0;
	var		nRowsAdded			= 0;
	var		sDelimiter;
	var		sMatchingColumnName1, sMatchingColumnName2;
	//
	var		sFirstName, sLastName, sTerminationDate;
	//
	//
	//
	oDiffs["error"]		= "";
	oDiffs["log"]   	= "Action\tKey\tFile 1 Row #\tFile 2 Row #\tChange Summary\t";
	oDiffs["file1"]		= [];
	oDiffs["file2"]		= [];
	oDiffs["changes1"]	= [];
	oDiffs["changes2"]	= [];
	//
	do {
	
		//	Assign delimiter.
		//
		sDelimiter = "\t";
		if (oSettings["delimiter"] != undefined) {
			sDelimiter = oSettings["delimiter"];
		}
	
		//	Assign matching column names, default to "SSN".
		//
		sMatchingColumnName1 = sMatchingColumnName2 = "SSN";
		if (oSettings["matchingcolumnname1"] != undefined) {
			sMatchingColumnName1 = oSettings["matchingcolumnname1"];
		}
		//
		if (oSettings["matchingcolumnname2"] != undefined) {
			sMatchingColumnName2 = oSettings["matchingcolumnname2"];
		}

		//	Convert first file to rows...
		//
		aRows1 = MapFileToRows(sFile1);
		aColumnNames1 = MapHeaderToColumnNames(aRows1[0], sDelimiter);
		aPK1  = GetColumnIndexesFromNames(aColumnNames1, sMatchingColumnName1);
		if (!aPK1.length) {
			oDiffs["error"] = "File 1 had no primary/matching column name called " + sMatchingColumnName1;
			break;
		}

		//	Convert second file to rows...
		//
		aRows2 = MapFileToRows(sFile2);
		aColumnNames2 = MapHeaderToColumnNames(aRows2[0], sDelimiter);
		aPK2  = GetColumnIndexesFromNames(aColumnNames2, sMatchingColumnName2);
		if (!aPK2.length) {
			oDiffs["error"] = "File 2 had no primary/matching column name called " + sMatchingColumnName2;
			break;
		}
		oDiffs["log"] += aColumnNames2.join('\t') + '\n';

		//	Let's iterate through the second file row by row, skipping header...
		//
		for (i = 1; i < aRows2.length; i++) {
			var sRow2 = aRows2[i];
			if (!sRow2.length) {
				continue;
			}
			var aRow2 = MapRowToColumns(sRow2, sDelimiter);
			var sPK2 = GenerateKey(aRow2, aPK2);
			
			//	a2 is an associative array (in js, an object), 
			//		keyed by SSN or whatever matching column is.
			//		a2index tracks the key to a line number for later display.
			//
			a2[sPK2] = aRow2;
			a2index[sPK2] = i;

		// ...end loop through second file.
		//
		}
		
		//	Map column names between files.
		//
		aColumnMap = CreateColumnMap(aColumnNames1, aColumnNames2, nMatchType);

		//	Let's iterate through the first file row by row, skipping header...
		//
		for (i = 1; i < aRows1.length; i++) {

			//	Find our primary key...
			//
			var sRow1 = aRows1[i];
			if (!sRow1.length) {
				continue;
			}
			var aRow1 = MapRowToColumns(sRow1, sDelimiter);
			var sPK1  = GenerateKey(aRow1, aPK1);
			var nRow2 = a2index[sPK1];

			//	Here's our difference engine.
			//
			//		Case 1: file 2 has a deleted row.
			//
			if (a2[sPK1] == undefined) {
				//
				aColumns1 = MapRowToColumns(sRow1, sDelimiter);
				for (var j = 0; j < aColumns1.length; j++) {
					var sColumnName = aColumnNames1[j].toUpperCase();
					if (sColumnName == "FIRST NAME"  ||  sColumnName == "FIRSTNAME"  ||  sColumnName == "FIRST_NAME") {
						sFirstName = aColumns1[j];
						continue;
					}
					if (sColumnName == "LAST NAME"  ||  sColumnName == "LASTNAME"  ||  sColumnName == "LAST_NAME") {
						sLastName = aColumns1[j];
						continue;
					}
					if (sColumnName == "TERMINATION DATE"  ||  sColumnName == "TERMINATIONDATE"  ||  sColumnName == "TERMINATION_DATE") {
						sTerminationDate = aColumns1[j];
						continue;
					}
				}
				//
				oDiffs["log"] += "delete\t" + sPK1 + "\t" + i + "\t\t" + sLastName + "\t" + sFirstName + "\t" + sTerminationDate + "\n";
				oDiffs["file1"][i] = "del";
				nRowsDeleted++;
				//
			//
			//		Case 2: row matched, let's compare columns.
			//
			} else {

				//
				nRowsThatMatched++;
				aColumnsIgnore = oSettings["columnsignore"];
				aColumns1 = MapRowToColumns(sRow1, sDelimiter);
				aColumns2 = a2[sPK1];
				sDiffs    = "";

				//	Capture key stuff about the row for later.
				//
				for (var j = 0; j < aColumns1.length; j++) {
					//
					var sColumnName = aColumnNames1[j].toUpperCase();
					if (sColumnName == "FIRST NAME"  ||  sColumnName == "FIRSTNAME"  ||  sColumnName == "FIRST_NAME") {
						sFirstName = aColumns1[j];
						continue;
					}
					if (sColumnName == "LAST NAME"  ||  sColumnName == "LASTNAME"  ||  sColumnName == "LAST_NAME") {
						sLastName = aColumns1[j];
						continue;
					}
				}

				//	Did we already see this key?  If so, we have a possible dup.
				//
				if (a2[sPK1] == "") {
					sDiffs = "review\t" + sPK1 + "\t" + i + "\t" + a2index[sPK1] + "\t" + sLastName + "\t" + sFirstName + "\t" + "Key already found in file1";
					sDiffs += "\n";
					oDiffs["log"] += sDiffs;
					oDiffs["file1"][i] = "rev";
					continue;
				}
			
				//	Rip through columns looking for differences.
				//
				aColumnChangesFile1 = [];
				aColumnChangesFile2 = [];
				for (var j = 0; j < aColumns1.length; j++) {

					//	Ignore the column?
					//
					if (aColumnsIgnore != undefined  &&  aColumnsIgnore[j]) {
						continue;
					}

					//	If the second file didn't have a matching column, ignore it.
					//
					if (aColumnMap[j] == -1) {
						continue;
					}
					if (aColumns1[j] == aColumns2[aColumnMap[j]]) {
						continue;
					}

					//	Tack on the columns that were different.
					//
					if (sDiffs == "") {
						sDiffs = "change\t" + sPK1 + "\t" + i + "\t" + a2index[sPK1] + "\t" + sLastName + "\t" + sFirstName + "\t";
					} else {
						sDiffs += "; ";
					}
					var a = aColumns1[j];
					var b = aColumns2[aColumnMap[j]];
					sDiffs += aColumnNames2[aColumnMap[j]] + ": " + b + "<=" + a;
					if (!isNaN(parseFloat(a))  &&  !isNaN(parseFloat(b))) {
						var nPct = (b - a) / a  * 100;
						sDiffs += " (" + nPct.toFixed(2) + "%)";
					}
					aColumnChangesFile1[j] = aColumns1[j];
					aColumnChangesFile2[aColumnMap[j]] = aColumns2[aColumnMap[j]];
				
				//	...end rip through columns.
				//
				}
				
				//	Mark as handled.
				//
				a2[sPK1] = "";
				
				//	If diffs were found, finish the diff entry with a line-feed.
				//
				if (sDiffs == "") {
					continue;
				}
				sDiffs += "\n";
				oDiffs["log"] += sDiffs;
				oDiffs["file1"][i] = "chg";
				oDiffs["file2"][nRow2] = "chg";
				oDiffs["changes1"][i] = aColumnChangesFile1;
				oDiffs["changes2"][nRow2] = aColumnChangesFile2;
				nRowsChanged++;
 
			// ...end row diff.
			//
			}

		// ...end loop through rows of first file.
		//
		}

		// Police remaining items in a2, which are adds
		//
		for (var sPK2 in a2) {
			//
			if (a2[sPK2] != "") {
				i = a2index[sPK2];
				sDiffs = "add\t" + sPK2 + "\t\t" + i + "\t\t" + a2[sPK2].join("\t") + "\n";
				oDiffs["log"] += sDiffs;
				oDiffs["file2"][i] = "add";
				nRowsAdded++;
			}
			//
		}

		//	Record final stats.
		//
		oDiffs["rowsmatched"]  = nRowsThatMatched;
		oDiffs["rowsadded"]    = nRowsAdded;
		oDiffs["rowschanged"]  = nRowsChanged;
		oDiffs["rowsdeleted"]  = nRowsDeleted;
		
	//
	} while (0);
	return (oDiffs);
}

//	Smoke-test.
//
function SmokeTestDiff() {
	var f1 =	"LNAME\tFNAME\tSSN\tSALARY\tSTATUS\n" +
				"Davis\tWillie\t123-45-6789\t75000\tACTIVE\n" +
				"Jackson\tMartha\t233-45-6789\t93000\tACTIVE\n" +
				"Stuart\tMaribeth\t421-02-6789\t54000\tACTIVE\n" +
				"Kilmeade\tSarah\t660-02-3331\t83000\tSUSPENDED\n";
	var f2 =	"INDEX\tLNAME\tFNAME\tSSN\tSALARY\tSTATUS\n" +
				"300\tDavis\tWillie\t123-45-6789\t75000\tACTIVE\n" +
				"303\tStuart\tMaribeth\t421-02-6789\t63000\tACTIVE\n" +
				"306\tCarson\tVictor\t987-55-5544\t122500\tACTIVE\n" +
				"309\tHalsey\tLeonard\t230-12-5454\t123000\tACTIVE\n" +
				"312\tKilmeade\tSarah\t660-02-3331\t83000\tACTIVE\n";
	var oSettings = [];
	var oDiffs = GenerateDiffs(f1, f2, oSettings);
	console.log(oDiffs["log"]);
	alert("done");
}

// --30--
