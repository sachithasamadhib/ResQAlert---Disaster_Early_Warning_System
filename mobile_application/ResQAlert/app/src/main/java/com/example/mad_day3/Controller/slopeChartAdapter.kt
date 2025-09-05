package com.example.mad_day3.Controller

import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.mad_day3.R
import com.jjoe64.graphview.GraphView
import com.jjoe64.graphview.series.DataPoint
import com.jjoe64.graphview.series.LineGraphSeries
class slopeChartAdapter : RecyclerView.Adapter<slopeChartAdapter.ChartViewHolder>() {

    // Store movement data points
    private val movementData = mutableListOf<DataPoint>()
    private var maxDataPoints = 20 // Limit number of points to show

    class ChartViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val lineGraphView: GraphView = itemView.findViewById(R.id.idGraphViewSlope)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChartViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.mov_detect_chart, parent, false)
        return ChartViewHolder(view)
    }

    override fun onBindViewHolder(holder: ChartViewHolder, position: Int) {
        configureGraphView(holder.lineGraphView)
    }

    // Public method to add new movement data
    fun addMovementData(timestamp: Double, acceleration: Double) {
        // Add new data point
        movementData.add(DataPoint(timestamp, acceleration))

        // Remove oldest data point if we exceed the limit
        if (movementData.size > maxDataPoints) {
            movementData.removeAt(0)
        }

        // Notify adapter that data has changed
        notifyDataSetChanged()
    }

    private fun configureGraphView(graphView: GraphView) {
        try {
            // Clear any existing series
            graphView.removeAllSeries()

            if (movementData.isNotEmpty()) {
                // Create new series with current data
                val series = LineGraphSeries(movementData.toTypedArray())

                // Configure series
                series.color = ContextCompat.getColor(graphView.context, R.color.red_500)
                series.isDrawDataPoints = true
                series.dataPointsRadius = 8f
                series.thickness = 4

                // Add series to graph
                graphView.addSeries(series)

                // Configure viewport with dynamic bounds
                val xValues = movementData.map { it.x }
                val yValues = movementData.map { it.y }

                val xMin = xValues.minOrNull() ?: 0.0
                val xMax = xValues.maxOrNull() ?: 10.0
                val yMin = (yValues.minOrNull() ?: 0.0) - 2.0 // Add some padding
                val yMax = (yValues.maxOrNull() ?: 10.0) + 2.0 // Add some padding

                graphView.viewport.isXAxisBoundsManual = true
                graphView.viewport.setMinX(xMin)
                graphView.viewport.setMaxX(xMax)

                graphView.viewport.isYAxisBoundsManual = true
                graphView.viewport.setMinY(yMin)
                graphView.viewport.setMaxY(yMax)

                // HIDE X-AXIS LABELS
                graphView.gridLabelRenderer.isHorizontalLabelsVisible = false

                // Configure Y-axis labels
                graphView.gridLabelRenderer.numVerticalLabels = 6
                graphView.gridLabelRenderer.textSize = 24f

                // Set Y-axis title
                graphView.gridLabelRenderer.verticalAxisTitle = "Acceleration (m/s²)"

                // Refresh the graph
                graphView.onDataChanged(true, true)
            }
        } catch (e: Exception) {
            Log.e("GraphView", "Error configuring graph: ${e.message}")
        }
    }

    override fun getItemCount(): Int {
        return 1
    }
}